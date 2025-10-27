#!/usr/bin/env bash
set -euo pipefail

# Collect metadata
DATETIME_TZ=$(date '+%Y-%m-%d %H:%M:%S %Z')
FILENAME_TS=$(date '+%Y-%m-%d_%H-%M-%S')

# Get GitHub username
GITHUB_USERNAME="[Use shared folder instead]"
if command -v gh >/dev/null 2>&1; then
  GITHUB_USERNAME=$(gh api user --jq '.login' 2>/dev/null || echo "[Use shared folder instead]")
fi

# Get Git user name
GIT_USER_NAME="[use the agent name]"
if command -v git >/dev/null 2>&1; then
  GIT_USER_NAME=$(git config user.name 2>/dev/null || echo "[use the agent name]")
fi

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  REPO_ROOT=$(git rev-parse --show-toplevel)
  REPO_NAME=$(basename "$REPO_ROOT")
  GIT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)
  GIT_COMMIT=$(git rev-parse HEAD)
else
  REPO_ROOT=""
  REPO_NAME=""
  GIT_BRANCH=""
  GIT_COMMIT=""
fi

# Optional: thoughts system status (may be long). Limit lines to avoid noise.
THOUGHTS_STATUS=""
if command -v thoughts >/dev/null 2>&1; then
  # Capture first 40 lines; adjust as needed.
  THOUGHTS_STATUS=$(thoughts status 2>/dev/null | head -n 40)
fi

# Print similar to the individual command outputs
echo "username: $GITHUB_USERNAME"
echo "Current Date/Time (TZ): $DATETIME_TZ"
echo "Git User Name: $GIT_USER_NAME"
[ -n "$GIT_COMMIT" ] && echo "Current Git Commit Hash: $GIT_COMMIT"
[ -n "$GIT_BRANCH" ] && echo "Current Branch Name: $GIT_BRANCH"
[ -n "$REPO_NAME" ] && echo "Repository Name: $REPO_NAME"
echo "Timestamp For Filename: $FILENAME_TS"
[ -n "$THOUGHTS_STATUS" ] && {
  echo "$THOUGHTS_STATUS"
}
