#!/usr/bin/env bash
set -euo pipefail

REMOTE="origin"
BR_STAGING="staging"
BR_PROD="main"

TAG="${1:-}"  # usage: ./deploy-prod.sh v1.2.3

if [[ -z "$TAG" ]]; then
  echo "Usage: $0 vX.Y.Z"
  exit 1
fi

git fetch --all --prune

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree not clean"; exit 1
fi

git checkout "$BR_PROD"
git pull --ff-only "$REMOTE" "$BR_PROD"
git merge --no-ff "origin/$BR_STAGING" -m "release: $TAG"
git tag -a "$TAG" -m "Release $TAG"
git push "$REMOTE" "$BR_PROD" --tags

echo "✅ Deploy script eseguito: merge $BR_STAGING → $BR_PROD + tag $TAG"
echo "👉 CI/CD ora dovrebbe attivare il deploy in PROD"