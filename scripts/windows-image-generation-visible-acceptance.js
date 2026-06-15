const { _electron: electron, request: pwRequest } = require('playwright')
const fs = require('fs')
const path = require('path')

const EXE_PATH = process.env.EPLATFORM_EXE || String.raw`C:\Program Files\e-platform\e-platform.exe`
const API_BASE = process.env.EPLATFORM_API_BASE || 'http://127.0.0.1:3001'
const REPORT_DIR = process.env.EPLATFORM_REPORT_DIR || String.raw`C:\eplatform-test\reports`
const SHOT_DIR = process.env.EPLATFORM_SHOT_DIR || String.raw`C:\eplatform-test\screenshots`
const KEY_PATH = process.env.EPLATFORM_KEY_PATH || String.raw`C:\eplatform-test\real-llm.key`
const APP_DATA_DIR = path.join(process.env.APPDATA, 'e-platform', 'data')
const IMAGE_DIR = path.join(APP_DATA_DIR, 'images')

fs.mkdirSync(REPORT_DIR, { recursive: true })
fs.mkdirSync(SHOT_DIR, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const reportPath = path.join(REPORT_DIR, `image-generation-visible-acceptance-${stamp}.json`)
const report = {
  startedAt: new Date().toISOString(),
  acceptanceType: 'user-visible',
  exePath: EXE_PATH,
  apiBase: API_BASE,
  appDataDir: APP_DATA_DIR,
  imageDir: IMAGE_DIR,
  checks: [],
  evidence: {
    screenshots: [],
    visibleImages: [],
    visibleImageMatches: [],
    historyImageMatches: [],
    selectedTiles: 0,
    historyImages: 0,
    generatedImages: [],
    apiRows: 0,
    matchedApiRows: 0,
    visibleErrors: [],
  },
  created: {
    imageProviderName: null,
    llmId: null,
    llmName: null,
  },
  pass: 0,
  fail: 0,
}

function addCheck(name, ok, extra = {}) {
  report.checks.push({ name, ok, extra, at: new Date().toISOString() })
  ok ? report.pass++ : report.fail++
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name} ${Object.keys(extra).length ? JSON.stringify(extra).slice(0, 500) : ''}`)
}

function parseKeyFile(file) {
  const data = {}
  const models = []
  const text = fs.readFileSync(file, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (key === 'base_url') data.baseUrl = value
    if (key === 'key') data.apiKey = value
    if (key === 'model') models.push(value)
  }
  data.imageModel = models.find((value) => /image/i.test(value)) || models[1]
  data.textModel = models.find((value) => !/image/i.test(value)) || models[0]
  return data
}

async function waitHealth(api, timeoutMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await api.get(`${API_BASE}/api/health`, { timeout: 3000 })
      if (res.ok()) return true
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

async function screenshot(page, name) {
  const file = path.join(SHOT_DIR, `${name}-${stamp}.png`)
  await page.screenshot({ path: file, fullPage: true })
  report.evidence.screenshots.push(file)
  return file
}

function readPngSize(file) {
  const buf = fs.readFileSync(file)
  const isPng = buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG'
  if (!isPng) return { format: 'unknown', width: 0, height: 0 }
  return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

async function clickNav(page, text) {
  await page.locator('.ant-menu-item').filter({ hasText: text }).first().click({ timeout: 15000 })
  await page.waitForTimeout(1200)
}

async function dismissFirstRun(page) {
  const ok = page.getByRole('button', { name: /知道|确定/ })
  if (await ok.count()) {
    await ok.first().click().catch(async () => ok.first().evaluate((element) => element.click()))
    await page.waitForTimeout(500)
  }
}

async function fillVisibleByLabel(page, label, value, index = 0) {
  await page.getByLabel(label, { exact: false }).nth(index).fill(value)
}

async function addImageProviderViaUi(page, key) {
  const name = `visible-img-${Date.now()}`
  report.created.imageProviderName = name
  await clickNav(page, '设置')
  await dismissFirstRun(page)
  await screenshot(page, 'visible-settings-before-image-provider')
  await page.getByRole('button', { name: /自定义添加/ }).first().click({ timeout: 10000 })
  await page.waitForTimeout(500)
  await fillVisibleByLabel(page, '名称', name)
  await fillVisibleByLabel(page, 'API 端点', key.baseUrl.replace(/\/$/, ''))
  await fillVisibleByLabel(page, 'API Key', key.apiKey)
  await fillVisibleByLabel(page, '模型', key.imageModel)
  await fillVisibleByLabel(page, '单次最大图片数', '2')
  await page.locator('.ant-modal button[type="submit"]').click({ timeout: 10000 })
  await page.waitForTimeout(1000)
  const visibleMatches = await page.getByText(name, { exact: true }).count()
  addCheck('UI added custom image provider in Settings', visibleMatches > 0, { name, visibleMatches })
  await screenshot(page, 'visible-settings-after-image-provider')
  return name
}

async function addLlmViaApi(api, key) {
  const id = `visible_llm_${Date.now()}`
  const name = `visible-llm-${Date.now()}`
  report.created.llmId = id
  report.created.llmName = name
  const res = await api.post(`${API_BASE}/api/llm/`, {
    data: {
      id,
      name,
      endpoint: key.baseUrl.replace(/\/$/, ''),
      api_key: key.apiKey,
      model: key.textModel,
      temperature: 0.2,
      max_tokens: 1024,
      is_default: true,
    },
    timeout: 10000,
  })
  addCheck('API prepared custom text LLM for UI flow', res.ok(), { status: res.status(), id, name, model: key.textModel })
  return { id, name }
}

async function selectAntOptionByTriggerText(page, triggerText, optionText) {
  await page.getByText(triggerText, { exact: false }).first().click({ force: true, timeout: 10000 })
  await page.waitForTimeout(300)
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').getByText(optionText, { exact: true }).last().click({ timeout: 10000 })
  await page.waitForTimeout(300)
}

async function selectFieldOption(page, label, optionText) {
  const field = page.locator('.fg').filter({ hasText: label }).last()
  await field.locator('.ant-select-selector').click({ force: true, timeout: 10000 })
  await page.waitForTimeout(300)
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').getByText(optionText, { exact: true }).last().click({ timeout: 10000 })
  await page.waitForTimeout(500)
}

async function collectVisibleErrors(page) {
  return await page.evaluate(() => {
    const selectors = ['.ant-message-error', '.ant-notification-notice-error', '[role="alert"]']
    return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)).map((element) => element.textContent.trim()).filter(Boolean))
  })
}

async function collectVisibleResultImages(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.ri')).map((tile, index) => {
      const rect = tile.getBoundingClientRect()
      const img = tile.querySelector('img')
      const imgRect = img ? img.getBoundingClientRect() : null
      return {
        index,
        tileVisible: rect.width > 0 && rect.height > 0,
        tileWidth: Math.round(rect.width),
        tileHeight: Math.round(rect.height),
        selected: tile.classList.contains('sel'),
        hasImage: !!img,
        imgVisible: !!img && imgRect.width > 0 && imgRect.height > 0,
        imgComplete: !!img && img.complete,
        naturalWidth: img ? img.naturalWidth : 0,
        naturalHeight: img ? img.naturalHeight : 0,
        renderedWidth: imgRect ? Math.round(imgRect.width) : 0,
        renderedHeight: imgRect ? Math.round(imgRect.height) : 0,
        src: img ? img.currentSrc || img.src : '',
      }
    })
  })
}

async function collectHistoryImages(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.ht img')).map((img, index) => {
      const rect = img.getBoundingClientRect()
      return {
        index,
        imgVisible: rect.width > 0 && rect.height > 0,
        imgComplete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        renderedWidth: Math.round(rect.width),
        renderedHeight: Math.round(rect.height),
        src: img.currentSrc || img.src,
      }
    })
  })
}

async function cleanupCreatedLlm(api) {
  if (!api || !report.created.llmId) return
  const del = await api.delete(`${API_BASE}/api/llm/${report.created.llmId}`).catch(() => null)
  addCheck('cleanup custom text LLM via API', !!del && del.ok(), { status: del ? del.status() : 0, id: report.created.llmId })
}

async function cleanupCreatedImageProvider(api) {
  if (!api || !report.created.imageProviderName) return
  const list = await api.get(`${API_BASE}/api/providers`, { timeout: 10000 }).catch(() => null)
  if (!list || !list.ok()) {
    addCheck('cleanup custom image provider via API', false, { reason: 'list failed', name: report.created.imageProviderName })
    return
  }
  const json = await list.json()
  const provider = (json.data || []).find((row) => row.name === report.created.imageProviderName)
  if (!provider) {
    addCheck('cleanup custom image provider via API', true, { reason: 'already absent', name: report.created.imageProviderName })
    return
  }
  const del = await api.delete(`${API_BASE}/api/providers/${provider.id}`).catch(() => null)
  addCheck('cleanup custom image provider via API', !!del && del.ok(), { status: del ? del.status() : 0, id: provider.id, name: provider.name })
}

function normalizePathForMatch(value) {
  return String(value || '').replace(/\\/g, '/').toLowerCase()
}

function getFileName(value) {
  return normalizePathForMatch(value).split('/').filter(Boolean).pop() || ''
}

function matchImagesToGeneratedAssets(images, generatedImages, apiRows) {
  const generatedNames = new Set(generatedImages.map((image) => getFileName(image.file)))
  const apiPaths = new Set(apiRows.map((row) => normalizePathForMatch(row.path || row.local_path || row.localPath || row.url)))
  const apiNames = new Set(Array.from(apiPaths).map(getFileName).filter(Boolean))

  return images.map((image) => {
    const src = normalizePathForMatch(image.src)
    const srcName = getFileName(src)
    const matchedByFileName = generatedNames.has(srcName)
    const matchedByApiName = apiNames.has(srcName)
    const matchedByApiPath = Array.from(apiPaths).some((apiPath) => apiPath && (src.includes(apiPath) || apiPath.includes(src)))
    return {
      index: image.index,
      srcKind: src.startsWith('file:') ? 'file' : src.startsWith('data:') ? 'data' : src.startsWith('http') ? 'remote' : 'other',
      srcName,
      matchedByFileName,
      matchedByApiName,
      matchedByApiPath,
      matched: matchedByFileName || matchedByApiName || matchedByApiPath,
    }
  })
}

async function main() {
  let app
  let api
  let cleanedCreatedLlm = false
  let cleanedCreatedImageProvider = false
  try {
    const key = parseKeyFile(KEY_PATH)
    addCheck('key file loaded without logging secret', !!key.baseUrl && !!key.apiKey && !!key.textModel && !!key.imageModel, {
      baseUrl: key.baseUrl,
      textModel: key.textModel,
      imageModel: key.imageModel,
      keyLength: key.apiKey.length,
    })

    const existingImages = new Set(fs.existsSync(IMAGE_DIR) ? fs.readdirSync(IMAGE_DIR) : [])
    api = await pwRequest.newContext({ timeout: 20000 })
    app = await electron.launch({ executablePath: EXE_PATH, timeout: 60000 })
    const page = await app.firstWindow({ timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2500)
    addCheck('installed Electron UI launched', !!page)
    addCheck('backend health ready', await waitHealth(api))

    await dismissFirstRun(page)
    const imageProviderName = await addImageProviderViaUi(page, key)
    await addLlmViaApi(api, key)

    await clickNav(page, 'AI 生成')
    await page.getByText('自然语言', { exact: false }).first().click({ timeout: 10000 })
    await page.waitForTimeout(800)
    await page.locator('textarea[placeholder*="白色陶瓷马克杯"]').fill('用户可见性验收：白色陶瓷马克杯，浅灰背景，自然光，电商主图，主体完整居中')
    await screenshot(page, 'visible-natural-before-generate')
    await selectAntOptionByTriggerText(page, '4 张', '2 张')
    await selectFieldOption(page, '提供商', imageProviderName)
    await page.waitForTimeout(1000)
    addCheck('image provider selected in UI before generation', await page.getByText(imageProviderName, { exact: true }).count() > 0, { name: imageProviderName })

    await page.getByRole('button', { name: /生成图片/ }).click({ timeout: 10000 })
    await page.waitForFunction(() => !document.body.textContent.includes('生成中'), null, { timeout: 240000 }).catch(() => {})
    await page.waitForTimeout(3000)
    await screenshot(page, 'visible-natural-after-generate')

    report.evidence.visibleErrors = await collectVisibleErrors(page)
    addCheck('no visible UI error after generation', report.evidence.visibleErrors.length === 0, { visibleErrors: report.evidence.visibleErrors })

    report.evidence.visibleImages = await collectVisibleResultImages(page)
    const visibleLoadedImages = report.evidence.visibleImages.filter((img) => img.tileVisible && img.hasImage && img.imgVisible && img.imgComplete && img.naturalWidth > 0 && img.naturalHeight > 0)
    addCheck('current result grid has requested visible loaded images', visibleLoadedImages.length >= 2, {
      visibleLoadedImages: visibleLoadedImages.length,
      totalTiles: report.evidence.visibleImages.length,
      images: visibleLoadedImages.map((img) => ({ index: img.index, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, renderedWidth: img.renderedWidth, renderedHeight: img.renderedHeight })),
    })

    await page.locator('.ri').first().click({ timeout: 10000 })
    await page.waitForTimeout(500)
    report.evidence.selectedTiles = await page.locator('.ri.sel').count()
    await screenshot(page, 'visible-natural-after-select')
    addCheck('user can select a generated result tile', report.evidence.selectedTiles > 0, { selectedTiles: report.evidence.selectedTiles })

    const imagesAfter = fs.existsSync(IMAGE_DIR) ? fs.readdirSync(IMAGE_DIR) : []
    const newImages = imagesAfter.filter((name) => !existingImages.has(name)).map((name) => path.join(IMAGE_DIR, name))
    report.evidence.generatedImages = newImages.map((file) => {
      const stat = fs.statSync(file)
      return { file, bytes: stat.size, ...readPngSize(file) }
    })
    addCheck('script verified generated image files', report.evidence.generatedImages.length >= 2, { count: report.evidence.generatedImages.length, images: report.evidence.generatedImages })
    addCheck('script verified image dimensions and bytes', report.evidence.generatedImages.every((img) => img.format === 'png' && img.width > 0 && img.height > 0 && img.bytes > 1024), { images: report.evidence.generatedImages })

    const listRes = await api.get(`${API_BASE}/api/images/images`, { timeout: 10000 })
    const listJson = await listRes.json()
    const rows = listJson?.data?.images || []
    const matchedRows = rows.filter((row) => newImages.includes(row.path || row.local_path || row.localPath))
    report.evidence.apiRows = rows.length
    report.evidence.matchedApiRows = matchedRows.length
    addCheck('script verified generated images visible via API', matchedRows.length >= 2, { apiRows: rows.length, matchedRows: matchedRows.length })

    report.evidence.visibleImageMatches = matchImagesToGeneratedAssets(visibleLoadedImages, report.evidence.generatedImages, matchedRows)
    const matchedVisibleImages = report.evidence.visibleImageMatches.filter((match) => match.matched)
    addCheck('visible UI images match generated files or API rows', matchedVisibleImages.length >= 2, {
      matchedVisibleImages: matchedVisibleImages.length,
      matches: report.evidence.visibleImageMatches,
    })

    await clickNav(page, '工作台')
    await clickNav(page, 'AI 生成')
    const historyImages = await collectHistoryImages(page)
    const visibleLoadedHistoryImages = historyImages.filter((image) => image.imgVisible && image.imgComplete && image.naturalWidth > 0 && image.naturalHeight > 0)
    report.evidence.historyImages = visibleLoadedHistoryImages.length
    report.evidence.historyImageMatches = matchImagesToGeneratedAssets(visibleLoadedHistoryImages, report.evidence.generatedImages, matchedRows)
    const matchedHistoryImages = report.evidence.historyImageMatches.filter((match) => match.matched)
    await screenshot(page, 'visible-natural-after-return')
    addCheck('generated images remain visible after returning to AI Generation', matchedHistoryImages.length >= 2, {
      visibleLoadedHistoryImages: visibleLoadedHistoryImages.length,
      matchedHistoryImages: matchedHistoryImages.length,
      matches: report.evidence.historyImageMatches,
    })

    await cleanupCreatedLlm(api)
    cleanedCreatedLlm = true
    await cleanupCreatedImageProvider(api)
    cleanedCreatedImageProvider = true
  } finally {
    if (api && !cleanedCreatedLlm) await cleanupCreatedLlm(api)
    if (api && !cleanedCreatedImageProvider) await cleanupCreatedImageProvider(api)
    if (api) await api.dispose().catch(() => {})
    if (app) await app.close().catch(() => {})
  }
}

main()
  .catch((err) => {
    addCheck('runner uncaught error', false, { message: err.message, stack: String(err.stack || '').slice(0, 1600) })
  })
  .finally(() => {
    try {
      fs.unlinkSync(KEY_PATH)
      addCheck('cleanup key file from Windows test directory', true, { path: KEY_PATH })
    } catch (err) {
      addCheck('cleanup key file from Windows test directory', !fs.existsSync(KEY_PATH), { path: KEY_PATH, message: err.message })
    }
    report.finishedAt = new Date().toISOString()
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
    console.log(`REPORT_PATH=${reportPath}`)
    process.exit(report.fail === 0 ? 0 : 1)
  })
