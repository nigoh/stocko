# stocko

Sprint 1として、家計管理の最小完成形（入力 / 一覧 / 残高反映）を実装しています。

## セットアップ

```bash
cd web
python -m http.server 3000
```

ブラウザで `http://localhost:3000/index.html` を開いてください。

## できること（Sprint 1）

- 画面遷移（入力画面 `/index.html`、一覧画面 `/entries.html`）
- 収入/支出の登録・編集・削除
- カテゴリ選択（食費 / 日用品 / 交通 / 光熱費 / 通信 / その他）
- LocalStorageへの永続化初期設定
- 残高自動計算

## ドキュメント

- 実装メモとE2E相当シナリオ: `docs/ssd/sprint1-household-mvp.md`
- エージェント実装ルール: `AGENTS.md`
