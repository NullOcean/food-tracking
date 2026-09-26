#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

if [[ ! -d "$PROJECT_DIR/ios" ]]; then
  echo "The native iOS project is missing: $PROJECT_DIR/ios" >&2
  echo "Run the initial Expo native setup before using this deploy script." >&2
  exit 1
fi

echo "Deploying Food Tracking to a connected iPhone..."
echo "Select your iPhone if Expo asks which device to use."

exec npx expo run:ios \
  --device \
  --configuration Release \
  --no-bundler
