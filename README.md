# stocko

Sprint 1として、家計管理の最小完成形（入力 / 一覧 / 残高反映）を実装しています。

## セットアップ

- エージェント実装ルール: `AGENTS.md`
- SSD環境の土台: `docs/ssd/README.md`
- 仕様テンプレート: `docs/ssd/spec-template.md`
- タスクテンプレート: `docs/ssd/task-template.md`
- 月次レポート実装仕様: `docs/ssd/monthly-report-implementation-solo-life-support-v1.md`
- Skills活用ベストプラクティス: `docs/ssd/skills-best-practices.md`
- PRテンプレート: `.github/pull_request_template.md`
- cc-sdd の GitHub Copilot 向けプロンプト: `.github/prompts/`
- cc-sdd 共通設定テンプレート: `.kiro/settings/`
- MCP 設定テンプレート: `.copilot/mcp-config.json`
```bash
cd web
python -m http.server 3000
```

ブラウザで `http://localhost:3000/index.html` を開いてください。

## cc-sdd / MCP 開発環境

```bash
# cc-sdd を再適用したい場合
npx cc-sdd@latest --copilot --lang ja --overwrite force
```

Copilot エージェントは、GitHub Copilot Chat から `.github/prompts/` の `/kiro-*` プロンプトを実行して利用します（例: `/kiro-steering` → `/kiro-spec-init`）。

```bash
# GitHub MCP Server を使う場合はトークンを設定
export GITHUB_PERSONAL_ACCESS_TOKEN=YOUR_TOKEN
```

- ローカル開発では、上記の環境変数をシェルに設定すれば動作します。
- リポジトリシークレットは必須ではありません（GitHub Actions で MCP を使う場合のみ、必要に応じて Secrets へ登録してください）。

## できること（Sprint 1）

- 画面遷移（入力画面 `/index.html`、一覧画面 `/entries.html`）
- 収入/支出の登録・編集・削除
- カテゴリ選択（食費 / 日用品 / 交通 / 光熱費 / 通信 / その他）
- LocalStorageへの永続化初期設定
- 残高自動計算

## ドキュメント

- 実装メモとE2E相当シナリオ: `docs/ssd/sprint1-household-mvp.md`
- エージェント実装ルール: `AGENTS.md`
