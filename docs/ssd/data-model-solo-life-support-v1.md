# Data Model: 一人暮らし支援アプリ（節約・家計管理）v1

## 変更前整理（目的 / 影響範囲 / 検証方法）
- 目的: 家計・予算・OCR・買い物候補の整合した永続化モデルを先に固定し、後続実装の手戻りを減らす。
- 影響範囲: DBスキーマ定義、ドメインモデル、集計ロジック、OCR確定フロー。
- 検証方法: スキーマ定義レビュー + 残高計算/予算期間計算の単体テストケース作成。

## スキーマ定義
### 基本マスタ/取引
- `categories`
  - `id`, `name`, `type`(income/expense), `is_active`, `created_at`, `updated_at`。
- `incomes`
  - `id`, `occurred_on`, `amount`, `category_id`, `memo`, `created_at`, `updated_at`。
- `expenses`
  - `id`, `occurred_on`, `amount`, `category_id`, `store_name`, `memo`, `source_type`(manual/ocr), `status`(draft/confirmed), `ocr_draft_id`, `created_at`, `updated_at`。
- `budgets`
  - `id`, `period_start`, `period_end`, `closing_day`, `total_budget_amount`, `carry_over_mode`, `created_at`, `updated_at`。
- `budget_category_limits`
  - `id`, `budget_id`, `category_id`, `limit_amount`, `alert_threshold`。
- `monthly_summaries`
  - `id`, `period_start`, `period_end`, `total_income`, `total_expense`, `net_amount`, `ending_balance`, `generated_at`。
- `shopping_candidates`
  - `id`, `item_name`, `category_id`, `candidate_bucket`(routine/out_of_stock/budget_fit), `reason_type`(inventory_prediction/routine/budget/manual), `estimated_amount`, `confidence`, `status`(suggested/edited/confirmed/dismissed), `suggested_at`, `confirmed_at`。
- `shopping_list_sessions`
  - `id`, `budget_id`, `session_name`, `remaining_budget_snapshot`, `candidate_total_amount`, `balance_delta_amount`, `data_quality`(enough/limited), `status`(draft/confirmed), `confirmed_at`, `created_at`, `updated_at`。
- `shopping_list_items`
  - `id`, `session_id`, `shopping_candidate_id`, `item_name`, `quantity`, `unit_price`, `line_amount`, `is_user_edited`, `display_last_purchased_on`, `display_consumption_interval_days`, `note`。

## ドメインロジック定義
### 残高計算式を単一責務で扱う
- `BalanceCalculator`（ドメインサービス）に「前月繰越 + 当月収入 - 当月支出」を集約する。
- 画面表示/API/集計バッチは直接計算せず、必ず同サービスを経由する。
- 入力: `period_start`, `period_end`, `opening_balance`。出力: `total_income`, `total_expense`, `ending_balance`。

### 締め日ベースの予算期間計算ロジック
- `BudgetPeriodResolver`を作成し、基準日(`base_date`)と`closing_day`から`period_start`/`period_end`を返す。
- 例: 締め日25日、基準日2025-04-10の場合、期間は2025-03-26〜2025-04-25。
- 月末超過（29〜31日）時は当該月の末日を締め日として補正する。

## OCR暫定値と確定データ
- `expense_ocr_drafts`
  - `id`, `receipt_image_url`, `ocr_raw_payload`, `extracted_amount`, `extracted_date`, `extracted_store_name`, `extracted_category_id`, `confidence`, `created_at`。
- `expenses.status`で`draft`/`confirmed`を区別し、確定時に`expense_ocr_drafts.id`を参照履歴として保持する（`ocr_draft_id`）。
- 確定操作前は暫定値を編集可能、確定後は通常の支出データとして集計対象にする。

## 在庫推定のための購入履歴
- `purchase_histories`
  - `id`, `item_name`, `category_id`, `last_purchased_on`, `purchase_count`, `purchase_frequency_days`, `average_consumption_interval_days`, `last_amount`, `updated_at`。
- `shopping_candidates`生成時に、`last_purchased_on`と`average_consumption_interval_days`から枯渇予測日を算出する。
- 学習初期（履歴不足）向けに`confidence`低下ルールを持たせる。
- 履歴3件未満の品目は`data_quality=limited`としてセッションへ伝播し、UIで手動編集前提の注意表示を必須化する。



## 買い物リストMVPルール
### 候補生成の3区分
- `candidate_bucket=routine`: 定期購入フラグまたは周期が安定した品目を抽出。
- `candidate_bucket=out_of_stock`: 枯渇予測日が当日以前の品目を抽出。
- `candidate_bucket=budget_fit`: 予算残に対して追加可能な候補を抽出。

### 推定根拠の表示
- `shopping_list_items.display_last_purchased_on` に最終購入日を保持する。
- `shopping_list_items.display_consumption_interval_days` に推定消費間隔を保持する。
- 推定根拠は確定後も監査できるよう、表示値スナップショットとして保存する。

### 予算整合チェック
- `candidate_total_amount = SUM(shopping_list_items.line_amount)` をセッション単位で計算する。
- `balance_delta_amount = remaining_budget_snapshot - candidate_total_amount` を保持する。
- `balance_delta_amount < 0` の場合は確定前エラー、`>=0` の場合は確定可能とする。

## ER図（mermaid.js）
```mermaid
erDiagram
    categories ||--o{ incomes : "category_id"
    categories ||--o{ expenses : "category_id"
    categories ||--o{ budget_category_limits : "category_id"
    categories ||--o{ shopping_candidates : "category_id"
    categories ||--o{ purchase_histories : "category_id"

    budgets ||--o{ budget_category_limits : "budget_id"
    budgets ||--o{ shopping_list_sessions : "budget_id"
    expense_ocr_drafts ||--o{ expenses : "ocr_draft_id"
    shopping_list_sessions ||--o{ shopping_list_items : "session_id"
    shopping_candidates ||--o{ shopping_list_items : "shopping_candidate_id"

    categories {
      uuid id PK
      string name
      enum type
      bool is_active
      datetime created_at
      datetime updated_at
    }

    incomes {
      uuid id PK
      date occurred_on
      decimal amount
      uuid category_id FK
      string memo
      datetime created_at
      datetime updated_at
    }

    expenses {
      uuid id PK
      date occurred_on
      decimal amount
      uuid category_id FK
      string store_name
      string memo
      enum source_type
      enum status
      uuid ocr_draft_id FK
      datetime created_at
      datetime updated_at
    }

    expense_ocr_drafts {
      uuid id PK
      string receipt_image_url
      json ocr_raw_payload
      decimal extracted_amount
      date extracted_date
      string extracted_store_name
      uuid extracted_category_id
      decimal confidence
      datetime created_at
    }

    budgets {
      uuid id PK
      date period_start
      date period_end
      int closing_day
      decimal total_budget_amount
      string carry_over_mode
      datetime created_at
      datetime updated_at
    }

    budget_category_limits {
      uuid id PK
      uuid budget_id FK
      uuid category_id FK
      decimal limit_amount
      decimal alert_threshold
    }

    monthly_summaries {
      uuid id PK
      date period_start
      date period_end
      decimal total_income
      decimal total_expense
      decimal net_amount
      decimal ending_balance
      datetime generated_at
    }

    purchase_histories {
      uuid id PK
      string item_name
      uuid category_id FK
      date last_purchased_on
      int purchase_count
      int purchase_frequency_days
      int average_consumption_interval_days
      decimal last_amount
      datetime updated_at
    }

    shopping_candidates {
      uuid id PK
      string item_name
      uuid category_id FK
      enum candidate_bucket
      enum reason_type
      decimal estimated_amount
      decimal confidence
      enum status
      datetime suggested_at
      datetime confirmed_at
    }

    shopping_list_sessions {
      uuid id PK
      uuid budget_id FK
      string session_name
      decimal remaining_budget_snapshot
      decimal candidate_total_amount
      decimal balance_delta_amount
      enum data_quality
      enum status
      datetime confirmed_at
      datetime created_at
      datetime updated_at
    }

    shopping_list_items {
      uuid id PK
      uuid session_id FK
      uuid shopping_candidate_id FK
      string item_name
      int quantity
      decimal unit_price
      decimal line_amount
      bool is_user_edited
      date display_last_purchased_on
      int display_consumption_interval_days
      string note
    }
```
