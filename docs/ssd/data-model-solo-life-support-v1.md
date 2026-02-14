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
  - `id`, `item_name`, `category_id`, `reason_type`(inventory_prediction/manual), `confidence`, `status`(suggested/confirmed/dismissed), `suggested_at`, `confirmed_at`。

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
  - `id`, `receipt_image_url`, `status`(queued/processing/completed/failed), `ocr_raw_payload`, `extracted_amount`, `extracted_date`, `extracted_store_name`, `extracted_category_candidates`(json), `selected_category_id`, `confidence`, `failure_reason`, `created_at`, `updated_at`。
- `expense_ocr_draft_edits`
  - `id`, `ocr_draft_id`, `field_name`, `before_value`, `after_value`, `edited_by`, `edited_at`。
- `expenses.status`で`draft`/`confirmed`を区別し、確定時に`expense_ocr_drafts.id`を参照履歴として保持する（`ocr_draft_id`）。
- 確定操作前は暫定値を編集可能、確定後は通常の支出データとして集計対象にする。
- `expense_ocr_drafts.confidence` が閾値未満（例: `< 0.70`）または `status=failed` の場合、`source_type=manual` での確定を推奨する。

## OCR入力から月次集計への反映ルール
1. OCR成功時
   - `expense_ocr_drafts(status=completed)` を作成後、ユーザー編集値で `expenses(status=confirmed)` を作成する。
2. OCR失敗時
   - `expense_ocr_drafts(status=failed)` と `failure_reason` を保存し、手入力で `expenses(source_type=manual)` を作成する。
3. 低信頼時
   - フォーム反映は許可するが、確定前にユーザー確認を必須化する。
4. 集計時
   - `expenses.status=confirmed` のみを `monthly_summaries.total_expense` に加算する。
   - `source_type` の違いで計算式は分岐しない（OCR/手入力を同一基準で集計）。

## 在庫推定のための購入履歴
- `purchase_histories`
  - `id`, `item_name`, `category_id`, `last_purchased_on`, `purchase_count`, `purchase_frequency_days`, `average_consumption_interval_days`, `last_amount`, `updated_at`。
- `shopping_candidates`生成時に、`last_purchased_on`と`average_consumption_interval_days`から枯渇予測日を算出する。
- 学習初期（履歴不足）向けに`confidence`低下ルールを持たせる。

## ER図（mermaid.js）
```mermaid
erDiagram
    categories ||--o{ incomes : "category_id"
    categories ||--o{ expenses : "category_id"
    categories ||--o{ budget_category_limits : "category_id"
    categories ||--o{ shopping_candidates : "category_id"
    categories ||--o{ purchase_histories : "category_id"

    budgets ||--o{ budget_category_limits : "budget_id"
    expense_ocr_drafts ||--o{ expenses : "ocr_draft_id"
    expense_ocr_drafts ||--o{ expense_ocr_draft_edits : "ocr_draft_id"

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
      enum status
      json ocr_raw_payload
      decimal extracted_amount
      date extracted_date
      string extracted_store_name
      json extracted_category_candidates
      uuid selected_category_id
      decimal confidence
      string failure_reason
      datetime created_at
      datetime updated_at
    }

    expense_ocr_draft_edits {
      uuid id PK
      uuid ocr_draft_id FK
      string field_name
      string before_value
      string after_value
      string edited_by
      datetime edited_at
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
      enum reason_type
      decimal confidence
      enum status
      datetime suggested_at
      datetime confirmed_at
    }
```
