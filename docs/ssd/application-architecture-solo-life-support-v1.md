# Application Architecture: 一人暮らし支援アプリ（節約・家計管理）v1

## 変更前整理（目的 / 影響範囲 / 検証方法）
- 目的: MVP実装時に、どのレイヤで何を実装するかを明確にし、開発者間で構成認識を揃える。
- 影響範囲: Webフロントエンド、BFF/API、ドメインサービス、外部OCR連携、DB設計。
- 検証方法: 構成図と実装ステップが task / data-model ドキュメントと矛盾しないことをレビューする。

## 構成方針
- Webフロントエンドを起点に、BFF/APIを介してドメインロジックへアクセスする。
- 残高計算・予算期間計算はドメインサービスに集約し、UI側で重複計算しない。
- 予算使用率計算・超過見込み判定はドメインサービスに集約し、UI側は表示責務に限定する。
- OCRは外部プロバイダの結果を `expense_ocr_drafts` に保存し、ユーザー確定後に `expenses` へ反映する。
- 集計・在庫推定は DB 上の履歴を参照して `monthly_summaries` / `shopping_candidates` を更新する。

## システム構成図（mermaid）
```mermaid
flowchart LR
    U[ユーザー] --> FE[Web UI
家計入力/予算/OCR確認/レポート]
    FE --> API[BFF/API
認証・入力検証・ユースケース実行]

    API --> BC[BalanceCalculator
前月繰越 + 当月収入 - 当月支出]
    API --> BR[BudgetPeriodResolver
締め日ベース期間計算]
    API --> BU[BudgetUsageCalculator
予算使用率/超過見込み判定]
    API --> OCRFlow[OCR確定フロー
draft -> confirmed]
    API --> Inv[在庫推定ロジック
購入履歴ベース]

    OCRFlow --> OCR[OCR Provider]

    API --> DB[(App DB)]
    DB --> T1[categories / incomes / expenses]
    DB --> T2[budgets / budget_category_limits]
    DB --> T2b[budget_usage_snapshots]
    DB --> T3[expense_ocr_drafts / monthly_summaries]
    DB --> T4[purchase_histories / shopping_candidates]
```

## 実装責務マップ
1. フロントエンド
   - 入力フォーム、OCR結果編集、予算設定、レポート表示を実装する。
2. BFF/API
   - 各ユースケースの入口としてバリデーション・権限チェック・トランザクション境界を実装する。
3. ドメインサービス
   - `BalanceCalculator` / `BudgetPeriodResolver` / `BudgetUsageCalculator` を単一責務で実装する。
4. データアクセス
   - `data-model-solo-life-support-v1.md` のスキーマに沿って永続化処理を実装する。
5. 外部連携
   - OCR結果を暫定データとして保存し、確定時のみ支出計上する。
6. バッチ/集計
   - 月次集計更新と買い物候補更新を定期実行またはイベント駆動で実装する。

## 予算管理MVPの処理フロー（Sprint 2）
```mermaid
sequenceDiagram
    participant U as User
    participant FE as Budget Settings UI
    participant API as Budget API
    participant BR as BudgetPeriodResolver
    participant BU as BudgetUsageCalculator
    participant DB as App DB

    U->>FE: 締め日・総額予算・カテゴリ予算を入力
    FE->>API: 保存/更新リクエスト
    API->>BR: 基準日+締め日から期間を解決
    BR-->>API: period_start/period_end
    API->>DB: budgets, budget_category_limits をupsert
    API->>BU: 期間内実績から使用率/超過見込みを算出
    BU->>DB: budget_usage_snapshots を保存
    API-->>FE: 使用率と超過見込みカテゴリを返却
    FE-->>U: 使用率表示 + 超過見込みカテゴリを強調表示
```

## 関連ドキュメント
- `docs/ssd/task-solo-life-support-v1.md`
- `docs/ssd/data-model-solo-life-support-v1.md`
- `docs/ssd/pre-implementation-decisions-solo-life-support-v1.md`
