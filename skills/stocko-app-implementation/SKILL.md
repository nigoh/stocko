---
name: stocko-app-implementation
description: Application実装時の要件整理・タスク分解・実装・検証・ドキュメント更新を一貫して進めるためのワークフローSkill。新機能追加、既存機能改修、実装計画作成、PR準備を行うときに使用する。
---

# Stocko App Implementation

最小変更で安全に実装を進めるための実行手順を提供する。

## Workflow
1. 目的・影響範囲・検証方法を 3 行で整理する。
2. `docs/ssd/spec-template.md` で受け入れ条件を明確にする。
3. `docs/ssd/task-template.md` で実装タスクを 3 ステップ以上に分解する。
4. 実装後に lint/test/build のうち、変更に対応するチェックを 1 つ以上実行する。
5. 変更内容を README または `docs/` に反映し、PR本文に検証結果を記載する。

## Execution Rules
- 1コミット1目的を優先する。
- 破壊的変更は事前に明示し、代替案を提示する。
- 推測で断定せず、実行結果を根拠に記述する。

## Failure Handling
- 依存コマンド不足時は、失敗理由と代替コマンドを提示する。
- 外部接続制限時は、ローカルで再現可能な検証手順に切り替える。

## Resources
- `references/implementation-workflow.md`: 実装時チェックリストとDoD。
- `scripts/create_ssd_task.sh`: Spec/Taskのひな形を追加作成する補助スクリプト。
