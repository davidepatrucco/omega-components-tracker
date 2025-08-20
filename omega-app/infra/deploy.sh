#!/usr/bin/env bash
set -euo pipefail

BR_DEV="develop"
BR_STAGING="staging"

git fetch --all --prune

# Safety: no uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree not clean"; exit 1
fi

git checkout "$BR_STAGING"
git pull --ff-only origin "$BR_STAGING"
git merge --no-ff "origin/$BR_DEV" -m "chore: merge $BR_DEV → $BR_STAGING"
git push origin "$BR_STAGING"

echo "✅ Pushed to $BR_STAGING (CI/CD should deploy STAGING)"