#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
# Use normal Python; the bundled Codex runtime is an optional local fallback.
PYTHON_BIN=${PYTHON_BIN:-python3}
if ! "$PYTHON_BIN" -m pip --version >/dev/null 2>&1; then
  CODEX_PYTHON="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
  if [ -x "$CODEX_PYTHON" ]; then PYTHON_BIN=$CODEX_PYTHON
  else echo 'Python with pip is required. On Mint: sudo apt install python3-pip'; exit 1; fi
fi
export PYTHONPATH="$APP_DIR/.voice-deps"
if ! "$PYTHON_BIN" -c 'import edge_tts' >/dev/null 2>&1; then
  echo 'First run: downloading the speech client (no voice model or audio deck).'
  "$PYTHON_BIN" -m pip install --no-cache-dir --target "$APP_DIR/.voice-deps" 'edge-tts==7.2.8'
fi
exec "$PYTHON_BIN" "$APP_DIR/voice_server.py" "$@"
