#!/usr/bin/env bash
set -euo pipefail

REMOTE="git@github.com:davidepatrucco/omega-tracker.git"
BR_DEV="development"
BR_STAGING="staging"

git fetch --all --prune

# Safety: no uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree not clean"; exit 1
fi

git checkout "$BR_STAGING"
git pull --ff-only "$REMOTE" "$BR_STAGING"
git merge --no-ff "origin/$BR_DEV" -m "chore: merge $BR_DEV → $BR_STAGING"
git push "$REMOTE" "$BR_STAGING"

echo "✅ Deploy script eseguito: merge $BR_DEV → $BR_STAGING e push a $REMOTE"
echo "👉 CI/CD ora dovrebbe attivare il deploy su STAGING"