#!/usr/bin/env bash
# Push GymManager to https://github.com/DavoodAkrami/Gym-management
set -euo pipefail

REPO_URL="${1:-https://github.com/DavoodAkrami/Gym-management.git}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Project: $ROOT"
echo "→ Remote:  $REPO_URL"

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
git branch -M main

echo "→ Branches:"
git log --oneline -3

# Prefer SSH if GitHub SSH works (often more reliable than HTTPS behind strict networks)
if ssh -T -o BatchMode=yes -o ConnectTimeout=8 git@github.com 2>&1 | grep -qi 'successfully authenticated'; then
  SSH_URL="git@github.com:DavoodAkrami/Gym-management.git"
  echo "→ Using SSH: $SSH_URL"
  git remote set-url origin "$SSH_URL"
  git push -u origin main
else
  echo "→ Using HTTPS (you may be prompted for GitHub username + Personal Access Token)"
  git remote set-url origin "$REPO_URL"
  GIT_HTTP_LOW_SPEED_LIMIT=0 GIT_HTTP_LOW_SPEED_TIME=600 \
    git -c http.version=HTTP/1.1 push -u origin main
fi

echo "✓ Done. Check: https://github.com/DavoodAkrami/Gym-management"
