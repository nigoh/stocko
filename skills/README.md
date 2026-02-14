# Skills環境セットアップ

このディレクトリは、Codex Skills をプロジェクトローカルで管理するための場所です。

## ディレクトリ構成

```text
skills/
└── stocko-app-implementation/
    ├── SKILL.md
    ├── scripts/
    │   └── create_ssd_task.sh
    └── references/
        └── implementation-workflow.md
```

## 使い方
1. Skill本体は `skills/<skill-name>/SKILL.md` に定義する。
2. 繰り返し実行する処理は `scripts/` に置く。
3. 詳細仕様やチェックリストは `references/` に置く。

## インストール（任意）
Codex の常設スキルとして使う場合は、`$CODEX_HOME/skills` にコピーします。

```bash
mkdir -p "$CODEX_HOME/skills"
cp -R skills/stocko-app-implementation "$CODEX_HOME/skills/"
```

## 検証
スキル形式の検証は以下を利用します。

```bash
python /opt/codex/skills/.system/skill-creator/scripts/quick_validate.py skills/stocko-app-implementation
```
