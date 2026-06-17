# Memory Summary

Task ID: 2026-06-17-image-generation-gpt-image-minimal-payload
Date: 2026-06-17

## Long-term Facts
- Windows strict direct external endpoint retest for commit 4e78e4c failed because the app-equivalent image payload sent `n`, `width`, and `height` to `https://openclawroot.com/v1/images/generations`, while a minimal `model` + `prompt` payload succeeded.
- For custom OpenAI-compatible `gpt-image-*` providers, text-to-image generation now defaults to minimal request payloads and sends one request per requested image unless the user explicitly provides count fields in provider default params.

## Security Notes
- No API keys, tokens, or raw credentials are stored in this summary.
