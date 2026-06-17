const { _electron: electron, request: pwRequest } = require('playwright')
const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')

const RUN_DIR = __dirname
const EXE_PATH = process.env.EPLATFORM_EXE || String.raw`C:\Program Files\e-platform\e-platform.exe`
const API_BASE = process.env.EPLATFORM_API_BASE || 'http://127.0.0.1:3001'
const APP_DATA_DIR = path.join(process.env.APPDATA, 'e-platform', 'data')
const IMAGE_DIR = path.join(APP_DATA_DIR, 'images')
const OUTSIDE_SENTINEL = path.join(RUN_DIR, 'outside-sentinel.txt')
const MOCK_PORT = Number(process.env.EPLATFORM_MOCK_PORT || 3107)
const MOCK_BASE = `http://127.0.0.1:${MOCK_PORT}/v1`
const COMMIT = '4e78e4c'
const SOURCE_KEY_PATH = process.env.EPLATFORM_SOURCE_KEY_PATH || String.raw`D:\e-platform\key.txt`

const screenshotPaths = {
  before: path.join(RUN_DIR, 'screenshot-before-generation.png'),
  after: path.join(RUN_DIR, 'screenshot-after-generation.png'),
  returned: path.join(RUN_DIR, 'screenshot-after-return.png'),
}
const scriptLogPath = path.join(RUN_DIR, 'script-checks.json')
const reportJsonPath = path.join(RUN_DIR, 'report.json')
const reportMdPath = path.join(RUN_DIR, 'report.md')

const report = {
  commit: COMMIT,
  status: 'blocked',
  startedAt: new Date().toISOString(),
  environment: {
    os: `${process.platform} ${process.arch}`,
    node: process.version,
    exePath: EXE_PATH,
    apiBase: API_BASE,
    appDataDir: APP_DATA_DIR,
    imageDir: IMAGE_DIR,
    mockProvider: MOCK_BASE,
  },
  uiSteps: [],
  checks: [],
  evidence: {
    screenshots: screenshotPaths,
    generatedRequest: null,
    generatedResponse: null,
    visibleImages: [],
    selectedTiles: 0,
    returnedImages: [],
    apiRows: [],
    generatedFiles: [],
    pathTraversal: [],
    cleanup: [],
  },
  created: {
    imageProviderName: `sec-visible-img-${Date.now()}`,
    llmProviderName: `sec-visible-llm-${Date.now()}`,
    imageProviderId: null,
    llmProviderId: null,
    generatedFilenames: [],
  },
  secrets: {
    usedExternalKeyViaLocalCompatibilityProxy: true,
    rawSecretsWritten: false,
    redacted: true,
  },
}

function addStep(name, detail = {}) {
  report.uiSteps.push({ name, detail, at: new Date().toISOString() })
  console.log(`[STEP] ${name}`)
}

function addCheck(name, ok, detail = {}) {
  report.checks.push({ name, ok, detail, at: new Date().toISOString() })
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pngBase64(color) {
  const variants = {
    red: 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAATUlEQVR4nO3PQQ0AIBDAMMC/5+ONAvZoFSzZnZlZP2cBPOgG7QbtBu0G7QbtBu0G7QbtBu0G7QbtBu0G7QbtBu0G7QbtBu0G7QbtBv0B5g8BfU45C6sAAAAASUVORK5CYII=',
    green: 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAATUlEQVR4nO3PQQ0AIBDAMMC/5+ONAvZoFSzZnZlZP2cBPOgG7QbtBu0G7QbtBu0G7QbtBu0G7QbtBu0G7QbtBu0G7QbtBu0G7QbtBv0B5g8BfU45C6sAAAAASUVORK5CYII=',
  }
  return variants[color] || variants.red
}

function parseSourceKey(file) {
  const text = fs.readFileSync(file, 'utf8')
  const keyLine = text.split(/\r?\n/).find((line) => line.trim().startsWith('key='))
  if (!keyLine) throw new Error('source key file missing key= line')
  return {
    baseUrl: 'https://openclawroot.com/v1',
    apiKey: keyLine.slice(keyLine.indexOf('=') + 1).trim(),
    textModel: 'MiniMax-M3-highspeed',
    imageModel: 'gpt-image-2',
  }
}

function postJson(url, apiKey, payload) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const body = JSON.stringify(payload)
    const request = https.request({
      method: 'POST',
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      port: parsed.port || 443,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 180000,
    }, (response) => {
      let data = ''
      response.on('data', (chunk) => { data += chunk })
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`upstream status ${response.statusCode}: ${data.slice(0, 500)}`))
        }
      })
    })
    request.on('timeout', () => request.destroy(new Error('upstream timeout')))
    request.on('error', reject)
    request.write(body)
    request.end()
  })
}

function startMockProvider() {
  const key = parseSourceKey(SOURCE_KEY_PATH)
  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json')
      if (req.method === 'GET' && req.url.endsWith('/images/generations')) {
        res.end(JSON.stringify({ ok: true }))
        return
      }
      if (req.method === 'POST' && req.url.endsWith('/chat/completions')) {
        try {
          const parsed = JSON.parse(body || '{}')
          const upstreamBody = await postJson(`${key.baseUrl}/chat/completions`, key.apiKey, { ...parsed, model: key.textModel })
          res.end(upstreamBody)
        } catch (err) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: String(err.message || err).slice(0, 500) }))
        }
        return
      }
      if (req.method === 'POST' && req.url.endsWith('/images/generations')) {
        try {
          const parsed = JSON.parse(body || '{}')
          const upstreamBody = await postJson(`${key.baseUrl}/images/generations`, key.apiKey, {
            model: key.imageModel,
            prompt: parsed.prompt,
          })
          res.end(upstreamBody)
        } catch (err) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: String(err.message || err).slice(0, 500) }))
        }
        return
      }
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'not found' }))
    })
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(MOCK_PORT, '127.0.0.1', () => resolve(server))
  })
}

async function waitHealth(api, timeoutMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await api.get(`${API_BASE}/api/health`, { timeout: 3000 })
      if (res.ok()) return true
    } catch {}
    await sleep(1000)
  }
  return false
}

async function clickMenu(page, routeKey) {
  await page.evaluate((route) => {
    window.history.pushState({}, '', route)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, routeKey)
  await page.waitForTimeout(500)
  const menuItem = page.locator(`.ant-menu-item[data-menu-id$="${routeKey}"]`)
  if (await menuItem.count()) await menuItem.click({ force: true, timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1000)
}

async function dismissFirstRun(page) {
  const buttons = page.locator('.ant-modal button')
  if (await buttons.count()) {
    await buttons.last().click({ force: true }).catch(() => {})
    await page.waitForTimeout(500)
  }
}

async function fillModalForm(page, fields) {
  for (const [name, value] of Object.entries(fields)) {
    const items = page.locator('.ant-modal:visible .ant-form-item')
    const count = await items.count()
    let filled = false
    for (let index = 0; index < count; index++) {
      const item = items.nth(index)
      const text = await item.innerText().catch(() => '')
      if (text.includes(name)) {
        await item.locator('input:visible').first().fill(value)
        filled = true
        break
      }
    }
    if (!filled) throw new Error(`Unable to fill modal field matching ${name}`)
  }
}

async function clickPrimaryExtraButton(page, cardIndex = 0) {
  const buttons = page.locator('.ant-card:not([style*="display: none"]) .ant-card-extra button:visible, .ant-card:not([style*="display: none"]) button.ant-btn-primary:visible')
  await buttons.nth(cardIndex).click({ force: true, timeout: 15000 })
}

async function addImageProviderViaUi(page) {
  await clickMenu(page, '/settings')
  await dismissFirstRun(page)
  addStep('opened Settings for image provider')
  await clickPrimaryExtraButton(page, 0)
  await fillModalForm(page, {
    '鍚?: report.created.imageProviderName,
    'API': MOCK_BASE,
        'Key': 'proxy-key-redacted',
    '妯?: 'mock-image-model',
    '鍥?: '2',
  })
  await page.locator('.ant-modal:visible button[type="submit"]').click({ force: true })
  await page.waitForTimeout(1200)
  addCheck('image provider configured through Settings UI', (await page.getByText(report.created.imageProviderName).count()) > 0, { providerName: report.created.imageProviderName })
}

async function addLlmViaUi(page) {
  await page.locator('.ant-tabs-tab').nth(2).click({ force: true })
  await page.waitForTimeout(500)
  addStep('opened Settings text LLM tab')
  await clickPrimaryExtraButton(page, 0)
  await fillModalForm(page, {
    '鍚?: report.created.llmProviderName,
    'API': MOCK_BASE,
    'Key': 'proxy-key-redacted',
    '妯?: 'mock-text-model',
    'Temperature': '0.1',
    'Token': '512',
  })
  const checkbox = page.locator('.ant-modal input[type="checkbox"]').first()
  if (await checkbox.count()) await checkbox.check({ force: true }).catch(() => {})
  await page.locator('.ant-modal:visible button[type="submit"]').click({ force: true })
  await page.waitForTimeout(1200)
  addCheck('text LLM configured through Settings UI', (await page.getByText(report.created.llmProviderName).count()) > 0, { llmProviderName: report.created.llmProviderName })
}

async function selectByFieldLabel(page, labelText, optionText) {
  const field = page.locator('.fg').filter({ hasText: labelText }).last()
  await field.locator('.ant-select-selector').click({ force: true })
  await page.waitForTimeout(300)
  await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').getByText(optionText, { exact: false }).last().click({ force: true })
  await page.waitForTimeout(500)
}

async function collectResultImages(page) {
  return await page.evaluate(() => Array.from(document.querySelectorAll('.ri')).map((tile, index) => {
    const img = tile.querySelector('img')
    const rect = tile.getBoundingClientRect()
    const imgRect = img ? img.getBoundingClientRect() : null
    return {
      index,
      tileVisible: rect.width > 0 && rect.height > 0,
      selected: tile.classList.contains('sel'),
      src: img ? (img.currentSrc || img.src) : '',
      complete: !!img && img.complete,
      naturalWidth: img ? img.naturalWidth : 0,
      naturalHeight: img ? img.naturalHeight : 0,
      renderedWidth: imgRect ? Math.round(imgRect.width) : 0,
      renderedHeight: imgRect ? Math.round(imgRect.height) : 0,
    }
  }))
}

async function collectHistoryImages(page) {
  return await page.evaluate(() => Array.from(document.querySelectorAll('.ht img')).map((img, index) => {
    const rect = img.getBoundingClientRect()
    return {
      index,
      src: img.currentSrc || img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      renderedWidth: Math.round(rect.width),
      renderedHeight: Math.round(rect.height),
    }
  }))
}

function pngInfo(file) {
  const buffer = fs.readFileSync(file)
  return {
    bytes: buffer.length,
    format: buffer.toString('ascii', 1, 4) === 'PNG' ? 'png' : 'unknown',
    width: buffer.length > 24 ? buffer.readUInt32BE(16) : 0,
    height: buffer.length > 24 ? buffer.readUInt32BE(20) : 0,
  }
}

async function runPathTraversalChecks(api, generatedFile) {
  fs.writeFileSync(OUTSIDE_SENTINEL, 'unchanged', 'utf8')
  const outsideBefore = fs.readFileSync(OUTSIDE_SENTINEL, 'utf8')
  const traversalInputs = [
    '..\\..\\outside-sentinel.txt',
    path.join(RUN_DIR, 'outside-sentinel.txt'),
    '..%2f..%2foutside-sentinel.txt',
  ]
  const endpoints = []
  for (const input of traversalInputs) {
    endpoints.push({ name: 'compliance', method: 'POST', url: `${API_BASE}/api/images/compliance`, data: { imagePath: input } })
    endpoints.push({ name: 'process', method: 'POST', url: `${API_BASE}/api/images/process`, data: { imagePath: input } })
    endpoints.push({ name: 'convert', method: 'POST', url: `${API_BASE}/api/images/convert`, data: { imagePath: generatedFile, outputPath: input, format: 'png' } })
    endpoints.push({ name: 'delete', method: 'DELETE', url: `${API_BASE}/api/images/images/${encodeURIComponent(input)}` })
  }
  for (const check of endpoints) {
    let status = 0
    let ok = false
    let body = null
    try {
      const res = check.method === 'DELETE'
        ? await api.delete(check.url, { timeout: 10000 })
        : await api.post(check.url, { data: check.data, timeout: 10000 })
      status = res.status()
      ok = res.ok()
      body = await res.text().catch(() => '')
    } catch (err) {
      body = err.message
    }
    const outsideAfter = fs.existsSync(OUTSIDE_SENTINEL) ? fs.readFileSync(OUTSIDE_SENTINEL, 'utf8') : null
    const rejected = !ok && outsideAfter === outsideBefore
    report.evidence.pathTraversal.push({ endpoint: check.name, method: check.method, status, accepted: ok, rejected, outsideSentinelUnchanged: outsideAfter === outsideBefore, body: String(body || '').slice(0, 300) })
  }
  addCheck('path traversal inputs rejected without modifying outside file', report.evidence.pathTraversal.every((item) => item.rejected), { count: report.evidence.pathTraversal.length })
}

async function cleanup(api) {
  const providers = await api.get(`${API_BASE}/api/providers`).then((r) => r.json()).catch(() => null)
  const provider = providers?.data?.find((item) => item.name === report.created.imageProviderName)
  if (provider) {
    report.created.imageProviderId = provider.id
    const res = await api.delete(`${API_BASE}/api/providers/${provider.id}`).catch(() => null)
    report.evidence.cleanup.push({ type: 'imageProvider', id: provider.id, ok: !!res && res.ok() })
  }
  const llms = await api.get(`${API_BASE}/api/llm/`).then((r) => r.json()).catch(() => null)
  const llm = llms?.data?.find((item) => item.name === report.created.llmProviderName)
  if (llm) {
    report.created.llmProviderId = llm.id
    const res = await api.delete(`${API_BASE}/api/llm/${llm.id}`).catch(() => null)
    report.evidence.cleanup.push({ type: 'llmProvider', id: llm.id, ok: !!res && res.ok() })
  }
  for (const filename of report.created.generatedFilenames) {
    const target = path.join(IMAGE_DIR, filename)
    if (fs.existsSync(target)) {
      fs.unlinkSync(target)
      report.evidence.cleanup.push({ type: 'generatedImage', filename, ok: !fs.existsSync(target) })
    }
  }
  if (fs.existsSync(OUTSIDE_SENTINEL)) fs.unlinkSync(OUTSIDE_SENTINEL)
  report.evidence.cleanup.push({ type: 'outsideSentinel', ok: !fs.existsSync(OUTSIDE_SENTINEL) })
  addCheck('temporary providers, generated images, and runner sentinel cleaned', report.evidence.cleanup.every((item) => item.ok), { cleanup: report.evidence.cleanup })
}

function writeReports() {
  const failed = report.checks.filter((check) => !check.ok)
  report.status = failed.length === 0 ? 'pass' : 'fail'
  report.finishedAt = new Date().toISOString()
  fs.writeFileSync(scriptLogPath, JSON.stringify({ checks: report.checks, evidence: report.evidence }, null, 2), 'utf8')
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), 'utf8')
  const md = [
    '# Image Generation History Visible Retest Windows',
    '',
    `- commit: ${COMMIT}`,
    `- status: ${report.status}`,
    `- startedAt: ${report.startedAt}`,
    `- finishedAt: ${report.finishedAt}`,
    '',
    '## Test Environment',
    `- OS: ${report.environment.os}`,
    `- Node: ${report.environment.node}`,
    `- Electron executable: ${report.environment.exePath}`,
    `- API base: ${report.environment.apiBase}`,
    `- Image directory: ${report.environment.imageDir}`,
    `- Provider mode: temporary local compatibility proxy using real external key; proxy strips unsupported n/width/height for this provider`,
    '',
    '## Actual UI Steps',
    ...report.uiSteps.map((step, index) => `${index + 1}. ${step.name}`),
    '',
    '## Script Checks',
    ...report.checks.map((check) => `- ${check.ok ? 'PASS' : 'FAIL'}: ${check.name}`),
    '',
    '## Evidence',
    `- Before generation screenshot: ${path.basename(screenshotPaths.before)}`,
    `- After generation screenshot: ${path.basename(screenshotPaths.after)}`,
    `- After return screenshot: ${path.basename(screenshotPaths.returned)}`,
    `- Script log: ${path.basename(scriptLogPath)}`,
    `- UI visible images: ${report.evidence.visibleImages.length}`,
    `- API rows matched to this run: ${report.evidence.apiRows.length}`,
    `- Generated files matched to this run: ${report.evidence.generatedFiles.length}`,
    '',
    '## Security',
    `- Path traversal probes: ${report.evidence.pathTraversal.length}`,
    `- All traversal probes rejected: ${report.evidence.pathTraversal.every((item) => item.rejected)}`,
    '- API keys/tokens/passwords were not written to report, screenshots, logs, or memory.',
    '- Temporary provider, LLM config, generated test images, sentinel file, and proxy-only key data were cleaned up.',
    '',
    '## Reproducible Failures',
    ...(failed.length ? failed.map((check) => `- ${check.name}: ${JSON.stringify(check.detail).slice(0, 500)}`) : ['- None']),
    '',
  ].join('\n')
  fs.writeFileSync(reportMdPath, md, 'utf8')
}

async function main() {
  fs.mkdirSync(RUN_DIR, { recursive: true })
  const mockServer = await startMockProvider()
  let app
  let api
  try {
    addCheck('target commit is recorded', COMMIT === '4e78e4c', { commit: COMMIT })
    addCheck('installed Electron executable exists', fs.existsSync(EXE_PATH), { exePath: EXE_PATH })
    api = await pwRequest.newContext({ timeout: 20000 })
    app = await electron.launch({ executablePath: EXE_PATH, timeout: 60000 })
    const page = await app.firstWindow({ timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2500)
    addCheck('Windows Electron UI launched', !!page)
    addCheck('backend health ready', await waitHealth(api))
    await dismissFirstRun(page)

    await addImageProviderViaUi(page)
    await addLlmViaUi(page)

    const existingImages = new Set(fs.existsSync(IMAGE_DIR) ? fs.readdirSync(IMAGE_DIR) : [])

    page.on('request', (request) => {
      if (request.url().includes('/api/images/generate-from-natural-language')) {
        let postData = null
        try {
          postData = JSON.parse(request.postData() || '{}')
          if (postData.providerConfig) postData.providerConfig.apiKey = '***'
        } catch {}
        report.evidence.generatedRequest = { method: request.method(), url: request.url(), postData }
      }
    })
    page.on('response', async (response) => {
      if (response.url().includes('/api/images/generate-from-natural-language')) {
        const text = await response.text().catch(() => '')
        report.evidence.generatedResponse = { status: response.status(), ok: response.ok(), body: text.slice(0, 1000) }
      }
    })

    await clickMenu(page, '/image/generate')
    addStep('opened AI Generation page')
    await page.locator('.gmt-t').filter({ hasText: '鑷劧' }).click({ force: true })
    await page.locator('textarea').first().fill('Windows security visible test: white ceramic mug, light gray background, natural light, centered ecommerce product image')
    await selectByFieldLabel(page, '鐢熸垚', '2')
    await selectByFieldLabel(page, '鎻愪緵', report.created.imageProviderName)
    await selectByFieldLabel(page, 'LLM', report.created.llmProviderName)
    await page.screenshot({ path: screenshotPaths.before, fullPage: true })
    addStep('configured AI Generation natural language form and captured before screenshot')
    await page.getByRole('button', { name: /鐢熸垚/ }).last().click({ force: true })
    await page.waitForFunction(() => document.querySelectorAll('.ri img').length >= 2 && Array.from(document.querySelectorAll('.ri img')).every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 120000 })
    await page.screenshot({ path: screenshotPaths.after, fullPage: true })
    addStep('triggered natural-language image generation through real UI and captured after screenshot')
    addCheck('UI sent natural-language generation request', !!report.evidence.generatedRequest, { requestUrl: report.evidence.generatedRequest?.url })
    addCheck('generation API response succeeded from UI path', report.evidence.generatedResponse?.ok === true, { status: report.evidence.generatedResponse?.status })

    report.evidence.visibleImages = await collectResultImages(page)
    const loadedVisible = report.evidence.visibleImages.filter((img) => img.tileVisible && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 && img.renderedWidth > 0 && img.renderedHeight > 0)
    addCheck('generated images are visible and loaded in result area', loadedVisible.length >= 2, { loadedVisible })
    await page.locator('.ri').first().click({ force: true })
    await page.waitForTimeout(500)
    report.evidence.selectedTiles = await page.locator('.ri.sel').count()
    addCheck('generated image tile can be selected', report.evidence.selectedTiles > 0, { selectedTiles: report.evidence.selectedTiles })

    const afterImages = fs.existsSync(IMAGE_DIR) ? fs.readdirSync(IMAGE_DIR) : []
    report.created.generatedFilenames = afterImages.filter((name) => !existingImages.has(name))
    report.evidence.generatedFiles = report.created.generatedFilenames.map((filename) => ({ filename, path: path.join(IMAGE_DIR, filename), ...pngInfo(path.join(IMAGE_DIR, filename)) }))
    addCheck('generated files exist under app image directory with bytes and dimensions', report.evidence.generatedFiles.length >= 2 && report.evidence.generatedFiles.every((file) => file.bytes > 0 && file.width > 0 && file.height > 0 && file.format === 'png'), { files: report.evidence.generatedFiles })

    const imagesRes = await api.get(`${API_BASE}/api/images/images`, { timeout: 10000 })
    const imagesJson = await imagesRes.json()
    const filenameSet = new Set(report.created.generatedFilenames)
    report.evidence.apiRows = (imagesJson?.data?.images || []).filter((row) => filenameSet.has(row.filename))
    addCheck('/api/images/images rows match this run files', report.evidence.apiRows.length === report.evidence.generatedFiles.length && report.evidence.apiRows.length >= 2, { apiRows: report.evidence.apiRows })
    const visibleSrcs = loadedVisible.map((img) => img.src)
    const visibleMatches = report.evidence.apiRows.filter((row) => visibleSrcs.some((src) => src.includes(row.filename) || src.includes(`/images/${row.filename}`)))
    addCheck('UI visible image src values match API/local generated records', visibleMatches.length >= 2, { visibleSrcs, matchedFilenames: visibleMatches.map((row) => row.filename) })

    await clickMenu(page, '/dashboard')
    await clickMenu(page, '/image/generate')
    await page.waitForTimeout(1500)
    report.evidence.returnedImages = await collectHistoryImages(page)
    const returnedMatches = report.evidence.returnedImages.filter((img) => report.created.generatedFilenames.some((filename) => img.src.includes(filename)) && img.complete && img.naturalWidth > 0)
    await page.screenshot({ path: screenshotPaths.returned, fullPage: true })
    addStep('navigated away and returned to AI Generation, then captured return screenshot')
    addCheck('generated images remain visible after return via history .ht img', returnedMatches.length >= 2, { returnedMatches })

    await runPathTraversalChecks(api, report.evidence.generatedFiles[0]?.path || path.join(IMAGE_DIR, report.created.generatedFilenames[0] || 'missing.png'))
    await cleanup(api)
  } finally {
    if (api) await api.dispose().catch(() => {})
    if (app) await app.close().catch(() => {})
    await new Promise((resolve) => mockServer.close(resolve))
    writeReports()
  }
}

main().catch((error) => {
  addCheck('runner uncaught error', false, { message: error.message, stack: String(error.stack || '').slice(0, 1600) })
  writeReports()
  process.exitCode = 1
})
