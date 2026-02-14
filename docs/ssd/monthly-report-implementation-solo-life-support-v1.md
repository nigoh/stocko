# Implementation: 月次レポート機能 v1

## 変更前整理（目的 / 影響範囲 / 検証方法）
- 目的: 月次レポートの受け入れ条件を満たすために、算出ロジック・表示導線・改善アクションロジック・性能計測手順を実装可能な粒度で定義する。
- 影響範囲: 月次集計ドメインサービス、レポートAPI、レポート画面、予算画面からの導線、性能計測運用。
- 検証方法: 仕様整合レビュー + 疑似データを用いた算出例検証 + 計測手順の再現確認。

## 対象期間の定義
- 1か月分は `BudgetPeriodResolver` が返す `period_start`〜`period_end` を基準に扱う。
- 前月差分は「同一締め日ルールで算出した直前期間」を比較対象にする。

## 1. 指標算出ロジック

### 1-1. 月単位の総支出
- 定義: `total_expense = SUM(expenses.amount)`（`status = confirmed` かつ対象期間内）。
- SQLイメージ:

```sql
SELECT COALESCE(SUM(e.amount), 0) AS total_expense
FROM expenses e
WHERE e.status = 'confirmed'
  AND e.occurred_on BETWEEN :period_start AND :period_end;
```

### 1-2. カテゴリ別割合
- 定義:
  - `category_expense = SUM(expenses.amount by category)`
  - `category_ratio = category_expense / total_expense * 100`
- `total_expense = 0` の場合は割合を 0% として扱う。

### 1-3. 前月差分
- 定義:
  - `diff_amount = current_total_expense - previous_total_expense`
  - `diff_rate = diff_amount / previous_total_expense * 100`
- `previous_total_expense = 0` の場合は `diff_rate` を `null` とし、UIは「比較対象なし」と表示する。

### 1-4. 収支差額
- 定義: `net_amount = total_income - total_expense`
- `total_income` は対象期間の `incomes.amount` 合計。

### 1-5. 残高推移
- 定義:
  - `opening_balance`: 前期間の `ending_balance`
  - `ending_balance = opening_balance + total_income - total_expense`
- 期間中推移（折れ線）:
  - 日次累積: `running_balance(d) = opening_balance + 累積income(<=d) - 累積expense(<=d)`

### 1-6. 予算比（使用率）
- 総額予算使用率: `budget_usage_rate = total_expense / budgets.total_budget_amount * 100`
- カテゴリ予算使用率: `category_usage_rate = category_expense / budget_category_limits.limit_amount * 100`
- 分母が 0 または未設定時は `null`（UI: 「未設定」バッジ）。

## 2. APIレスポンス仕様（レポート画面向け）

```json
{
  "period": {
    "start": "2025-04-26",
    "end": "2025-05-25",
    "previous_start": "2025-03-26",
    "previous_end": "2025-04-25"
  },
  "summary": {
    "total_income": 280000,
    "total_expense": 173000,
    "net_amount": 107000,
    "opening_balance": 52000,
    "ending_balance": 159000,
    "expense_diff_amount": 12000,
    "expense_diff_rate": 7.45
  },
  "budget": {
    "total_budget_amount": 200000,
    "budget_usage_rate": 86.5
  },
  "category_breakdown": [
    {
      "category_id": "food",
      "category_name": "食費",
      "expense_amount": 62000,
      "expense_ratio": 35.84,
      "previous_expense_amount": 54000,
      "diff_amount": 8000,
      "category_budget_amount": 60000,
      "category_usage_rate": 103.33
    }
  ],
  "balance_trend": [
    {"date": "2025-04-26", "balance": 52000},
    {"date": "2025-04-27", "balance": 49800}
  ],
  "action_candidates": [
    {
      "code": "ACTION_FOOD_OVER_BUDGET",
      "title": "外食頻度の見直し",
      "description": "食費がカテゴリ予算を超過しています。週2回までに抑える案を検討してください。",
      "priority": "high"
    }
  ]
}
```

## 3. 画面導線（予算比と合わせて確認）
- 月次レポート画面の上部に以下を配置する。
  1. 総支出 / 前月差分
  2. 収支差額
  3. 残高推移グラフ
  4. 予算比カード（総額 + カテゴリ別上位3件）
- 導線:
  - 予算画面の「月次レポートで詳細を見る」ボタンから、同一期間パラメータ付きで遷移する。
  - レポート画面のカテゴリ行クリックで、予算設定画面の該当カテゴリ編集へディープリンクする。

```mermaid
flowchart LR
  A[ホーム: 今月予算残高] --> B[予算画面]
  B -->|月次レポートで詳細を見る| C[月次レポート画面]
  C --> D[カテゴリ内訳]
  D -->|カテゴリ行クリック| E[予算カテゴリ設定]
  C --> F[改善アクション候補]
```

## 4. 改善アクション候補の表示ロジック（ルールベース）

### 4-1. ルール定義
1. `ACTION_TOTAL_OVER_90`
   - 条件: `budget_usage_rate >= 90`
   - 優先度: `high`
   - 文言: 「総額予算の使用率が90%を超えています。変動費の見直し候補を確認してください。」
2. `ACTION_CATEGORY_OVER_100`
   - 条件: `category_usage_rate >= 100`（カテゴリごと）
   - 優先度: `high`
   - 文言: 「{category_name} が予算超過です。頻度と単価のどちらを下げるか決めましょう。」
3. `ACTION_FOOD_RATIO_HIGH`
   - 条件: `food_ratio >= 35` かつ `food_diff_amount > 0`
   - 優先度: `medium`
   - 文言: 「食費比率が高く増加傾向です。外食回数の上限を設定してみましょう。」
4. `ACTION_FIXED_COST_RATIO_HIGH`
   - 条件: `fixed_cost_ratio >= 50`
   - 優先度: `medium`
   - 文言: 「固定費比率が高いため、通信・サブスクの見直し余地があります。」
5. `ACTION_NET_NEGATIVE`
   - 条件: `net_amount < 0`
   - 優先度: `high`
   - 文言: 「収支がマイナスです。翌月予算を再配分して赤字解消を優先しましょう。」

### 4-2. 表示制御
- 同一カテゴリで複数ルールがヒットした場合は優先度高いものを優先。
- 画面表示は最大3件。
- 1件もヒットしない場合は `ACTION_KEEP_GOOD` を表示する。

## 5. 性能目標（2秒以内）に対する計測手順

### 5-1. 計測対象
- 対象: 「月次レポート画面を開いて主要ウィジェット（サマリー/カテゴリ内訳/残高推移/改善アクション）が描画完了するまで」
- KPI: p95 が 2秒以内

### 5-2. データ条件
- 1か月分データ（目安）
  - 支出 300件
  - 収入 20件
  - カテゴリ 10件
  - 予算カテゴリ上限 10件

### 5-3. 計測手順
1. 疑似データを投入する（固定seed）。
2. ブラウザのPerformance計測またはE2E計測で、レポート画面遷移を30回実行する。
3. 以下タイムスタンプを記録する。
   - `t0`: レポート画面遷移開始
   - `t1`: API応答受信完了
   - `t2`: 主要ウィジェット描画完了
4. 指標を算出する。
   - API時間: `t1 - t0`
   - 描画時間: `t2 - t1`
   - 合計: `t2 - t0`
5. 30回の p50 / p95 を算出し、`p95 <= 2000ms` を合格とする。

### 5-4. 失敗時の切り分け
- API時間が閾値超過: 集計SQLのインデックス見直し（`occurred_on`, `category_id`, `status`）。
- 描画時間が閾値超過: グラフデータ点数の削減（日次→週次切替）を検討。

## 6. 実装完了条件
- [ ] 総支出、カテゴリ別割合、前月差分が同一期間定義で算出される。
- [ ] 収支差額と残高推移が同一画面で確認できる。
- [ ] 予算画面↔月次レポート画面の双方向導線がある。
- [ ] ルールベース改善アクションが最大3件表示される。
- [ ] 2秒以内目標に対する計測手順が定義され、再現可能である。
