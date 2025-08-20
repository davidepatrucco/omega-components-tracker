#!/usr/bin/env bash
set -euo pipefail

REMOTE="origin"
BR_DEV="development"
BR_STAGING="staging"
BR_PROD="main"

TARGET="${1:-}"       # usage: ./deploy.sh staging | prod [tag]
TAG="${2:-}"          # serve solo per prod, es: ./deploy.sh prod v1.2.3

if [[ "$TARGET" != "staging" && "$TARGET" != "prod" ]]; then
  echo "Usage:"
  echo "  $0 staging"
  echo "  $0 prod vX.Y.Z"
  exit 1
fi

git fetch --all --prune

# safety check
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree not clean"; exit 1
fi

if [[ "$TARGET" == "staging" ]]; then
  git checkout "$BR_STAGING"
  git fetch "$REMOTE" "$BR_STAGING"
  git reset --hard "$REMOTE/$BR_STAGING"
  git merge --no-ff "$REMOTE/$BR_DEV" -m "chore: merge $BR_DEV → $BR_STAGING"
  git push "$REMOTE" "$BR_STAGING"
  echo "✅ Deploy su STAGING completato (merge $BR_DEV → $BR_STAGING)"
  echo "👉 CI/CD staging dovrebbe partire"
  echo "Torno su branch development"
  git checkout "$BR_DEV"

elif [[ "$TARGET" == "prod" ]]; then
  if [[ -z "$TAG" ]]; then
    echo "❌ Per prod serve un tag: $0 prod vX.Y.Z"
    exit 1
  fi

  git checkout "$BR_PROD"
  git fetch "$REMOTE" "$BR_PROD"
  git reset --hard "$REMOTE/$BR_PROD"
  git merge --no-ff "$REMOTE/$BR_STAGING" -m "release: $TAG"
  git tag -a "$TAG" -m "Release $TAG"
  git push "$REMOTE" "$BR_PROD" --tags
  
  echo "✅ Deploy su PROD completato (merge $BR_STAGING → $BR_PROD + tag $TAG)"
  echo "👉 CI/CD prod dovrebbe partire"

  echo "Torno su branch development"
  git checkout "$BR_DEV"

fi