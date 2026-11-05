#!/usr/bin/env python3
"""Compatibility entry point. The canonical dependency-free builder uses Node 22+."""
import subprocess
import sys
from pathlib import Path
raise SystemExit(subprocess.call(['node', str(Path(__file__).with_name('build.mjs')), *sys.argv[1:]]))
