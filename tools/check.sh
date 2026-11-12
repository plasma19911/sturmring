#!/bin/sh
# Vor jedem Upload ausführen: sh tools/check.sh
cd "$(dirname "$0")/.." && node tools/check.js && python3 tools/check_page.py
