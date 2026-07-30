#!/bin/bash
set -e

echo "=== Creating/activating virtualenv ==="
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate

echo "=== Installing dependencies ==="
pip install -q --upgrade pip
pip install -q -r requirements.txt -r requirements-dev.txt

echo "=== Running tests ==="
pytest -q

echo "=== Linting ==="
ruff check .

echo "=== Type checking ==="
mypy src

echo "=== Environment healthy ==="