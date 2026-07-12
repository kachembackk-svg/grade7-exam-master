#!/usr/bin/env bash
set -e
cd client
if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)..."
  npm install
fi
npm run dev -- --host 0.0.0.0 --port 3000
