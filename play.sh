#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

git pull
npm install

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
fi

npm start
