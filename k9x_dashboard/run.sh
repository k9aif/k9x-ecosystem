#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi

source .venv/bin/activate

if [ ! -f ".env" ]; then
  echo "Missing .env -- copy .env.sample to .env and fill in your HIL Postgres details first."
  exit 1
fi

echo "k9x Dashboard → http://localhost:8087"
python3 main.py
