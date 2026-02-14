# Task: 一人暮らし支援アプリ（節約・家計管理）v1

## 変更前整理（目的 / 影響範囲 / 検証方法）
- 目的: 要件定義フェーズを完了し、Web版MVP実装フェーズへ進むための実行計画を確定する。
- 影響範囲: 実装タスク定義ドキュメントのみ（コード実装は未着手）。
- 検証方法: タスクが「着手順」「完了条件」「検証方法」を満たしていることを目視確認し、差分チェックを行う。

## タスク概要
- 対象リリース: Web先行MVP（後続でAndroid/iOS展開）
- 対象機能: 家計管理（収入・支出・残高）、予算管理（締め日・カテゴリ別予算）、レシートOCR、買い物リスト自動生成、月次レポート。
- 実行方針: 2週間×3スプリントで段階実装し、各スプリントで動作可能な状態を維持する。

## マイルストーン
1. M1: Web基盤 + 家計入力の基本導線完成
2. M2: OCR / 予算管理 / 月次レポート完成
3. M3: AI在庫切れ推定 + 買い物リスト自動生成 + 結合検証完成

## スプリント別実装ステップ
### Sprint 1（基盤・家計管理）
1. Webアプリ基盤構築
   - 画面遷移、永続化、共通UIレイアウトを実装する。
2. 家計管理機能
   - 収入/支出の登録・編集・削除とカテゴリ管理を実装する。
   - 残高の自動算出ロジックを実装する。
3. 基本テスト
   - 家計入力→一覧→残高反映までのE2E相当シナリオを確認する。

### Sprint 2（OCR・予算・レポート）
4. レシートOCR入力機能
   - レシート画像から金額・日付・店舗名・カテゴリ候補を抽出し、支出入力フォームへ反映する。
   - OCR結果は確定前にユーザー編集できるようにする。
5. 予算管理機能
   - 予算期間の締め日設定、総額予算、カテゴリ別予算の入力・更新を実装する。
6. 月次レポート機能
   - 月次集計、カテゴリ内訳、前月比、収支差額、残高推移を表示する。

### Sprint 3（買い物リスト自動生成・結合）
7. 買い物リスト自動生成
   - 購入履歴から在庫切れを推定するAIロジックを組み込み、候補生成する。
   - 推定根拠（最終購入日・推定消費間隔）を表示し、編集・確定・保存できるようにする。
8. 結合検証
   - 受け入れ条件に対する動作確認を実施し、結果を記録する。

## 実装着手前チェックリスト
- [x] Web技術スタック（フレームワーク/状態管理/DB）を確定した（`pre-implementation-decisions-solo-life-support-v1.md`参照）
- [x] OCRプロバイダ候補と費用上限を確定した（`pre-implementation-decisions-solo-life-support-v1.md`参照）
- [x] AI在庫推定の最小モデル方針（ルール + 軽量推定）を確定した（`pre-implementation-decisions-solo-life-support-v1.md`参照）
- [ ] デモ用の初期データセットを準備した

## 検証コマンド
- `test -f docs/ssd/spec-solo-life-support-v1.md`
- `test -f docs/ssd/task-solo-life-support-v1.md`
- `git diff --check`
- `test -f docs/ssd/pre-implementation-decisions-solo-life-support-v1.md`

## 完了条件
- [ ] Sprint 1〜3の着手順と成果物が合意済み
- [ ] 実装着手前チェックリストが埋まっている
- [ ] 検証コマンド結果を記録済み
## タスク概要
- 目的: SpecをもとにMVP実装へ進むための実装タスクを定義する。
- 対象: Web先行リリースを前提に、家計管理（収入・支出・残高）、予算管理（締め日・カテゴリ別予算）、レシートOCR、買い物リスト自動生成、月次レポート。

## 実装ステップ
1. データモデル定義
   - 目的 / 影響範囲 / 検証方法
     - 目的: 家計・予算・OCR・買い物候補の整合した永続化モデルを先に固定し、後続実装の手戻りを減らす。
     - 影響範囲: DBスキーマ定義、ドメインモデル、集計ロジック、OCR確定フロー。
     - 検証方法: スキーマ定義レビュー + 残高計算/予算期間計算の単体テストケース作成。
   - 1-1. 基本マスタ/取引スキーマを定義する。
     - `categories`
       - `id`, `name`, `type`(income/expense), `is_active`, `created_at`, `updated_at`。
     - `incomes`
       - `id`, `occurred_on`, `amount`, `category_id`, `memo`, `created_at`, `updated_at`。
     - `expenses`
       - `id`, `occurred_on`, `amount`, `category_id`, `store_name`, `memo`, `source_type`(manual/ocr), `status`(draft/confirmed), `created_at`, `updated_at`。
     - `budgets`
       - `id`, `period_start`, `period_end`, `closing_day`, `total_budget_amount`, `carry_over_mode`, `created_at`, `updated_at`。
     - `budget_category_limits`
       - `id`, `budget_id`, `category_id`, `limit_amount`, `alert_threshold`。
     - `monthly_summaries`
       - `id`, `period_start`, `period_end`, `total_income`, `total_expense`, `net_amount`, `ending_balance`, `generated_at`。
     - `shopping_candidates`
       - `id`, `item_name`, `category_id`, `reason_type`(inventory_prediction/manual), `confidence`, `status`(suggested/confirmed/dismissed), `suggested_at`, `confirmed_at`。
   - 1-2. 残高計算式を単一責務で扱う。
     - `BalanceCalculator`（ドメインサービス）に「前月繰越 + 当月収入 - 当月支出」を集約する。
     - 画面表示/API/集計バッチは直接計算せず、必ず同サービスを経由する。
     - 入力: `period_start`, `period_end`, `opening_balance`。出力: `total_income`, `total_expense`, `ending_balance`。
   - 1-3. 締め日ベースの予算期間計算ロジックを定義する。
     - `BudgetPeriodResolver`を作成し、基準日(`base_date`)と`closing_day`から`period_start`/`period_end`を返す。
     - 例: 締め日25日、基準日2025-04-10の場合、期間は2025-03-26〜2025-04-25。
     - 月末超過（29〜31日）時は当該月の末日を締め日として補正する。
   - 1-4. OCR暫定値と確定データを分離する。
     - `expense_ocr_drafts`
       - `id`, `receipt_image_url`, `ocr_raw_payload`, `extracted_amount`, `extracted_date`, `extracted_store_name`, `extracted_category_id`, `confidence`, `created_at`。
     - `expenses.status`で`draft`/`confirmed`を区別し、確定時に`expense_ocr_drafts.id`を参照履歴として保持する（`ocr_draft_id`）。
     - 確定操作前は暫定値を編集可能、確定後は通常の支出データとして集計対象にする。
   - 1-5. 在庫推定に必要な購入履歴項目を保持する。
     - `purchase_histories`
       - `id`, `item_name`, `category_id`, `last_purchased_on`, `purchase_count`, `purchase_frequency_days`, `average_consumption_interval_days`, `last_amount`, `updated_at`。
     - `shopping_candidates`生成時に、`last_purchased_on`と`average_consumption_interval_days`から枯渇予測日を算出する。
     - 学習初期（履歴不足）向けに`confidence`低下ルールを持たせる。
2. 家計管理機能
   - 収入/支出の登録・編集・削除とカテゴリ管理を実装する。
   - 残高の自動算出ロジックを実装する。
3. レシートOCR入力機能
   - レシート画像から金額・日付・店舗名・カテゴリ候補を抽出し、支出入力フォームへ反映する。
   - OCR結果はユーザーが確定前に編集できるようにする。
4. 予算管理機能
   - 予算期間の締め日設定、総額予算、カテゴリ別予算の入力・更新を実装する。
5. 月次レポート機能
   - 月次集計、カテゴリ内訳、前月比を表示する。
   - 収支差額と残高推移を表示する。
6. 買い物リスト自動生成
   - 購入履歴から在庫切れを推定するAIロジックを組み込み、候補生成する。
   - 推定根拠（最終購入日・推定消費間隔）を表示し、編集・確定・保存できるようにする。
7. 品質確認
   - 受け入れ条件に対する動作確認を実施し、結果を記録する。

## 検証コマンド
- `test -f docs/ssd/spec-solo-life-support-v1.md`
- `test -f docs/ssd/task-solo-life-support-v1.md`

## 完了条件
- [ ] 実装完了
- [ ] 検証完了
- [ ] ドキュメント更新
