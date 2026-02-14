#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <feature-name>"
  exit 1
fi

FEATURE_NAME="$1"
BASE_DIR="docs/ssd/tasks"
TARGET_FILE="${BASE_DIR}/${FEATURE_NAME}.md"

mkdir -p "$BASE_DIR"

cat > "$TARGET_FILE" <<'TASK'
# Task: __FEATURE_NAME__

## タスク概要
- 

## 実装ステップ
1. 
2. 
3. 

## 検証コマンド
- ` `

## 完了条件
- [ ] 実装完了
- [ ] 検証完了
- [ ] ドキュメント更新
TASK

sed -i "s/__FEATURE_NAME__/${FEATURE_NAME}/g" "$TARGET_FILE"

echo "Created: $TARGET_FILE"
