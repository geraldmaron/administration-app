#!/usr/bin/env bash
# Runs a command with this repo's secrets resolved from 1Password.
#
# The convention docs/DECISIONS.md §12.1 records: secrets live in the
# geralddagher-projects vault, are referenced by item UUID from
# ~/.config/claude/.env.op, and are resolved at runtime — never written to
# disk, never committed, never pasted into a shell.
#
#   scripts/run.sh node studio-cli/dist/cli.js scenarios run <jobId>
set -euo pipefail

ENV_FILE="${CLAUDE_ENV_OP_FILE:-$HOME/.config/claude/.env.op}"

if [ "$#" -eq 0 ]; then
  echo "usage: scripts/run.sh <command> [args...]" >&2
  exit 2
fi

if ! command -v op >/dev/null 2>&1; then
  echo "the 1Password CLI (op) is not installed — see docs/DECISIONS.md §12.1" >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "no env file at $ENV_FILE — see docs/DECISIONS.md §12.1" >&2
  exit 1
fi

exec op run --env-file="$ENV_FILE" -- "$@"
