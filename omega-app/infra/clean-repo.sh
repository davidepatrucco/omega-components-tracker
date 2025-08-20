#!/usr/bin/env bash
set -euo pipefail

REMOTE="git@github.com:davidepatrucco/omega-tracker.git"

# 1) Clona mirror
git clone --mirror "$REMOTE"
cd omega-tracker.git

# 2) Riscrivi TUTTA la history rimuovendo i file ovunque (branch+tag)
git filter-branch --force --index-filter \
  'git rm -r --cached --ignore-unmatch .env .env.staging .env.prod .credentials' \
  --prune-empty --tag-name-filter cat -- --all

# 3) Pulisci refs/reflog e compatta
rm -rf refs/original/
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin || true
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4) Push forzato (branch + tag)
git push --force --all
git push --force --tags