#!/bin/zsh
set -e
cd /Users/gerald/Git/admin-app/admin-app

BUNDLES=(
  bundle_economy
  bundle_politics
  bundle_military
  bundle_tech
  bundle_environment
  bundle_social
  bundle_health
  bundle_diplomacy
  bundle_justice
  bundle_corruption
  bundle_culture
  bundle_infrastructure
  bundle_resources
  bundle_authoritarian
)

FAILURES=()

for bundle in "${BUNDLES[@]}"; do
  echo "=== GENERATE: $bundle ==="
  if node bin/scenario-loops.js generate --bundle "$bundle" --count 2 -y; then
    echo "--- OK: $bundle ---"
  else
    echo "!!! FAILED: $bundle !!!"
    FAILURES+=("$bundle")
  fi
done

echo ""
echo "=== GENERATION COMPLETE ==="
if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo "Failed bundles: ${FAILURES[*]}"
else
  echo "All bundles succeeded."
fi
