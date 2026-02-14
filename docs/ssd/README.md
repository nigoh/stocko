# SSD環境の土台

このドキュメントは、Application 実装に入る前の **SSD環境の最小土台** を定義します。

## SSDで整えるもの
- **S (Spec):** 要件・受け入れ条件
- **S (Structure):** 構成・責務分離
- **D (Delivery):** 実装・検証・共有手順

## 推奨ディレクトリ構成（最小）

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   └── ssd/
│       ├── README.md
│       ├── spec-template.md
│       ├── task-template.md
│       └── skills-best-practices.md
└── .github/
    └── pull_request_template.md
```

## 運用フロー（最小）
1. `spec-template.md` に要件を記載。
2. `task-template.md` に実装タスクを分解。
3. 小さな単位で実装し、検証コマンドを実行。
4. PRテンプレートに背景・変更内容・検証結果を記載。

## 初期セットアップチェックリスト
- [ ] エージェントルール (`AGENTS.md`) を配置
- [ ] 要件テンプレートを作成
- [ ] タスクテンプレートを作成
- [ ] PRテンプレートを作成
- [ ] READMEにセットアップ導線を記載


## Skills活用
- 役割設計と運用ルールは `docs/ssd/skills-best-practices.md` を参照。
- まず役割を割り当て、次にSkillのトリガーと検証方法を定義する。
