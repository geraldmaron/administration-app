#!/usr/bin/env bash
# Run any command with this repo's environment resolved from 1Password.
#
#   scripts/with-secrets.sh pnpm --filter @admin/studio run dev
#
# Every `op://` reference in secrets.env is substituted by `op run` at launch,
# so a secret reaches the process without ever reaching the disk. Requires the
# 1Password CLI and an unlocked session (`op signin`).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v op >/dev/null 2>&1; then
  echo "with-secrets: the 1Password CLI (op) is not installed — brew install 1password-cli" >&2
  exit 127
fi

# A local override sits beside the committed file and wins where it overlaps,
# so a machine-specific value never has to be edited into version control.
env_files=("--env-file=$here/secrets.env")
if [[ -f "$here/secrets.env.local" ]]; then
  env_files+=("--env-file=$here/secrets.env.local")
fi

# Masking stays on: `op run` redacts resolved secret values from the child's
# stdout and stderr, which is the difference between a stack trace that is safe
# to paste into an issue and one that is not.
exec op run "${env_files[@]}" -- "$@"
