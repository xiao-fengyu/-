$ErrorActionPreference = 'Stop'

$runDir = 'D:\e-platform\test-reports\runs\2026-06-17-image-generation-history-visible-retest-windows'
$strictPath = Join-Path $runDir 'image-generation-visible-acceptance-2026-06-17T04-14-18-533Z.json'
$cleanupPath = Join-Path $runDir 'cleanup-checks.json'

$strict = Get-Content -Raw -LiteralPath $strictPath | ConvertFrom-Json
$cleanup = Get-Content -Raw -LiteralPath $cleanupPath | ConvertFrom-Json

$report = [ordered]@{
  commit = '4e78e4c'
  status = 'fail'
  verdict = 'fail'
  testedBuild = 'Installed Windows exe at C:\Program Files\e-platform\e-platform.exe; target repository HEAD was 4e78e4ca95127b25cf9977694d89518e1ba56363'
  endpointMode = 'strict-direct-external-endpoint'
  externalEndpoint = 'https://openclawroot.com/v1'
  startedAt = $strict.startedAt
  finishedAt = $strict.finishedAt
  environment = [ordered]@{
    os = 'Windows'
    exePath = 'C:\Program Files\e-platform\e-platform.exe'
    apiBase = $strict.apiBase
    appDataDir = $strict.appDataDir
    imageDir = $strict.imageDir
  }
  actualUiSteps = @(
    'Settings: added temporary custom image provider with endpoint https://openclawroot.com/v1 and redacted real API key',
    'Settings/API: prepared temporary text LLM using MiniMax-M3-highspeed and same redacted external base URL',
    'AI Generation: opened Natural Language mode through Electron UI',
    'AI Generation: selected temporary image provider, selected count 2, and triggered Generate Image through the UI',
    'After generation: inspected current result area, API rows, filesystem images, navigated away and returned to AI Generation'
  )
  scriptChecks = $strict.checks
  evidence = [ordered]@{
    screenshots = [ordered]@{
      before = 'screenshot-before-generation.png'
      after = 'screenshot-after-generation.png'
      afterReturn = 'screenshot-after-return.png'
    }
    generateRequests = $strict.evidence.generateRequests
    promptFromText = [ordered]@{
      status = $strict.evidence.promptFromText.status
      ok = $strict.evidence.promptFromText.ok
      promptLength = $strict.evidence.promptFromText.promptLength
      llmProvider = $strict.evidence.promptFromText.llmProvider
    }
    imagePayloadComparison = $strict.evidence.imagePayloadComparison
    visibleImages = $strict.evidence.visibleImages
    visibleImageMatches = $strict.evidence.visibleImageMatches
    historyImageMatches = $strict.evidence.historyImageMatches
    generatedImages = $strict.evidence.generatedImages
    apiRows = $strict.evidence.apiRows
    matchedApiRows = $strict.evidence.matchedApiRows
    selectedTiles = $strict.evidence.selectedTiles
    historyImages = $strict.evidence.historyImages
    visibleErrors = $strict.evidence.visibleErrors
  }
  failures = @(
    'Direct external provider UI generation did not produce current result tiles: .ri img count was 0.',
    'No generated image files were produced for the direct-endpoint UI run.',
    '/api/images/images contained no current-run matching rows.',
    'After navigating away and returning to AI Generation, .ht img contained no current-run visible image.',
    'Diagnostic provider comparison showed minimal external payload succeeded but app-equivalent payload with n/width/height timed out after 120s.'
  )
  cleanup = [ordered]@{
    strictRun = [ordered]@{
      temporaryProviderDeleted = (($strict.checks | Where-Object name -eq 'cleanup custom image provider via API').ok)
      temporaryLlmDeleted = (($strict.checks | Where-Object name -eq 'cleanup custom text LLM via API').ok)
      temporaryKeyCopyDeleted = (($strict.checks | Where-Object name -eq 'cleanup key file from Windows test directory').ok)
      generatedTestImagesDeleted = 'none created in strict direct-endpoint run'
    }
    laterProxyAttemptCleanup = $cleanup
  }
  secretHandling = @(
    'Raw API key was read from D:\e-platform\key.txt but is not committed intentionally.',
    'Reports redact providerConfig.apiKey as ***.',
    'An accidental Playwright call-log Authorization value in the first JSON artifact was redacted before report finalization.',
    'Select-String sk-/Bearer sk audit was run after redaction and returned no matches for final report artifacts.'
  )
  nonPassingProxyAttempt = 'A later local compatibility proxy attempt used the same real external key but is excluded from the verdict because the requested strict path requires the UI provider endpoint to be the real external URL directly.'
}

$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $runDir 'report.json') -Encoding UTF8

$script = [ordered]@{
  commit = '4e78e4c'
  status = 'fail'
  strictEndpoint = 'https://openclawroot.com/v1'
  checks = $strict.checks
  cleanup = $report.cleanup
  artifacts = @('report.md', 'report.json', 'script-checks.json', 'screenshot-before-generation.png', 'screenshot-after-generation.png', 'screenshot-after-return.png')
}
$script | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $runDir 'script-checks.json') -Encoding UTF8

$pass = ($strict.checks | Where-Object ok).Count
$fail = ($strict.checks | Where-Object { -not $_.ok }).Count
$lines = @(
  '# Image Generation History Visible Retest Windows',
  '',
  '- commit: 4e78e4c',
  '- status: fail',
  '- target: Windows UI, strict direct external endpoint',
  '- installed exe: C:\Program Files\e-platform\e-platform.exe',
  '- endpoint: https://openclawroot.com/v1',
  '',
  '## Summary',
  '- The Electron UI launched and backend health passed.',
  '- The UI added a temporary custom image provider using the real external endpoint and redacted key.',
  '- The UI triggered /api/images/generate-from-natural-language.',
  '- The direct external provider run produced no visible result tile, no generated file, no matching /api/images/images row, and no history .ht img after return.',
  '- Diagnostic comparison: minimal external image payload succeeded, but app-equivalent payload with n/width/height timed out after 120s.',
  '',
  '## Actual UI Steps'
)
$lines += $report.actualUiSteps | ForEach-Object { "- $_" }
$lines += @('', '## Script Checks')
$lines += $strict.checks | ForEach-Object { "- $(if ($_.ok) { 'PASS' } else { 'FAIL' }): $($_.name)" }
$lines += @('', '## Counts', "- pass: $pass", "- fail: $fail", '- blocked: 0')
$lines += @('', '## Evidence', '- screenshot-before-generation.png', '- screenshot-after-generation.png', '- screenshot-after-return.png', '- report.json', '- script-checks.json', '- cleanup-checks.json')
$lines += @('', '## Failure Evidence')
$lines += $report.failures | ForEach-Object { "- $_" }
$lines += @('', '## Cleanup')
$lines += @(
  "- strict run temporary provider deleted: $($report.cleanup.strictRun.temporaryProviderDeleted)",
  "- strict run temporary LLM deleted: $($report.cleanup.strictRun.temporaryLlmDeleted)",
  "- strict run temporary key copy deleted: $($report.cleanup.strictRun.temporaryKeyCopyDeleted)",
  "- strict run generated test images: $($report.cleanup.strictRun.generatedTestImagesDeleted)",
  "- later proxy attempt provider cleanup records: $($cleanup.providers.Count)",
  "- later proxy attempt LLM cleanup records: $($cleanup.llms.Count)",
  "- later proxy attempt image cleanup records: $($cleanup.images.Count)",
  '- runner.js retained as evidence in this report directory.'
)
$lines += @('', '## Secret Handling')
$lines += $report.secretHandling | ForEach-Object { "- $_" }
$lines += @('', '## Note', '- The later local compatibility proxy attempt is excluded from this verdict because the required strict path is direct UI provider endpoint to the real external URL.')
$lines | Set-Content -LiteralPath (Join-Path $runDir 'report.md') -Encoding UTF8

Get-ChildItem -LiteralPath $runDir -File | Select-Object Name,Length
