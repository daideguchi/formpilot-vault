# Vault Registration UX Architecture

作成日: 2026-06-02
状態: `product_design`
専門レビュー正本: `docs/19_professional_uiux_review_decisions.md`

## 結論

FormPilot Vaultの登録体験は、2つに分ける。

- popup: 今開いているフォームを埋めるための、小さく速い操作面
- full-page Vault Manager: たくさんの情報を登録・整理・育成するための、ブラウザ全体の管理画面

どちらも同じ `vaultState` を読む。同じ情報を別々に持たない。

専門UI/UXレビューの判断として、以後の実装では `popupは3歩のみ`、`Ledger/Profile/Inbox/Site Memoryの概念整理`、`AIに送らない証拠UI`、`貯まった軸の課金転換` を優先します。

## ユーザー向け概念の決定

UI上では、以下の意味で統一します。

- `Vault`: 暗号化ストレージそのもの。技術用語なので、原則UIには出さない
- `Ledger`: ユーザーが持つ事実のフラットDB。ユーザーに見せる中心概念
- `Profiles`: Ledgerに対するビュー / ペルソナ
- `Capture Inbox`: Ledgerへ入れる前の未確定情報の受信箱
- `Site Memory`: サイト固有の入力習慣

ユーザー体験は `1つのLedger x 複数Profile x サイトごとの記憶` に揃えます。

## なぜ分けるか

popupは、幅390px前後の現場UIです。フォームを見ながら、確認、入力、未知項目の追加だけを速く行う場所にする。

一方で、ユーザーには以下のような人がいる。

- 氏名、住所、会社、部署、役職だけでなく、会員IDや紹介コードも登録したい
- 個人用、会社用、副業用、家族用など複数プロフィールを持ちたい
- 住所、電話番号、メール、会社情報、定型文を大量に整理したい
- サイト別にどの情報が使われたか見直したい
- 一括登録、検索、カテゴリ整理、インポート/エクスポートをしたい

この層にpopupだけで応えようとすると、UIが狭くなり、フォーム入力という本来の現場体験も壊れる。

## 体験の役割分担

### 1. Popup: Quick Capture / Fill Console

popupは `検出 -> 確認 -> 入力` の3歩だけを中心にします。小さなpopupに情報整理機能を詰め込まない。

目的:

- フォーム検出
- 入力プラン確認
- 自動入力
- 未知項目のその場登録
- 既存プロフィールの軽い編集
- 課金状態の確認

popupでやること:

- `Scan Form`
- `Fill`
- 入力プランの確認
- 不明項目の最小解決
- 未登録項目をその場でLedgerへ追加
- `送信ボタンは押しません` の常時確認
- `AIに送る情報をプレビュー` の表示
- `ローカル暗号化中` / `AIに値を送りません` のTrust表示
- `Open Vault Manager` で全画面管理へ移動

popupでやらないこと:

- 大量項目の整理
- 複数Profileの本格管理
- import/export
- サイト別memoryの詳細編集
- 監査ログ表示
- チーム共有管理
- 内部用語 `profile_key` / `semantic_key` の表示

### 2. Full-page Vault Manager: Saved Info OS

目的:

- ユーザーが自分の入力情報を安心して蓄積・整理する
- 使うほど便利になるVaultを見える形にする
- Plus/Pro/Teamの課金価値を体感させる

入口:

- popupの `Open Vault Manager`
- extension options page
- Chrome拡張アイコン右クリックの `Options`
- Checkout successページから `Set up your Vault`

推奨配置:

- `extension/manager.html`
- `extension/manager.js`
- `extension/manager.css`
- manifestに `options_page: "manager.html"` を追加

開き方:

```js
chrome.tabs.create({ url: chrome.runtime.getURL("manager.html") });
```

## Full-page Vault Managerの画面構成

### Dashboard

- 現在のプロフィール
- 今月の入力回数
- Ledgerの項目数
- 推定節約時間
- 最近学習したサイト
- 未登録候補の件数
- Plan状態
- Privacy状態

ここは説明ページではなく、作業を始める管理トップにする。

### Profiles

- 個人メイン
- 会社メイン
- 副業用
- 家族用
- 任意のカスタムプロフィール

Freeは1プロフィール。Plus以上で複数プロフィールを解放する。

### Saved Info Ledger

一番重要な管理面。

テーブル形式:

| Category | Label | Value | Aliases | Use for | Sensitivity |
|---|---|---|---|---|---|
| ID | 会員ID | ... | customer id, member no | signup/account | normal |
| Work | 部署 | ... | department, division | business forms | normal |
| Sheet | スプレッドシート項目 | ... | sheet term | internal forms | normal |

必要な機能:

- 検索
- カテゴリ絞り込み
- 行追加
- 複製
- 並び替え
- CSV/JSON import
- encrypted backup export
- aliasの複数登録
- `AIには実値を送らない` 状態表示
- 使用回数
- 最終使用
- 信頼度
- 形式バリエーション
- 変更履歴

### Capture Inbox

popupでフォーム検出した未知項目を、後で整理する場所。Inbox Zeroを目標にします。

例:

- `紹介コード`
- `会員番号`
- `担当者部署`
- `代理店ID`

popupでは仮登録だけ行い、full-pageでカテゴリ、alias、使うProfile、値を整理できる。

すべての候補には同じ4アクションを置く。

- 台帳に追加 / 上書き保存
- 別の種類 / ラベルで追加
- 1回限り
- 破棄 / 無視

### Site Memory

サイト別に学習した対応関係を確認する。

表示するもの:

- origin
- path pattern
- field label
- profile key
- source: AI / rule / user correction / fill success
- confidence
- last used
- forget control

実値は表示しない。ここは `どのフォーム項目がどのプロフィールキーに対応したか` だけを見せる。

### Import / Export

Plus以上の課金価値にする。

- JSON import
- CSV import
- encrypted backup export
- device migration
- Team版では共有テンプレート import/export

Freeでも手動入力はできるが、一括登録や複数プロフィールはPlus以上へ寄せる。

### Plan

- Free: 月20回、基本プロフィール1つ
- Plus: 無制限、複数プロフィール、フルVault管理、一括登録
- Pro: 会社プロフィール、住所複数、入力履歴、長文補助
- Team: 共有テンプレート、共有mapping、監査ログ

課金訴求は、単に「無制限」ではなく、`自分用に育ったVaultを本格管理できる` にする。

課金転換は3軸で行います。

- 足りない軸: Free月20回、残り回数
- 貯まった軸: Ledger項目数、学習サイト数、節約時間、Inbox件数
- 欲しい軸: 2つ目のProfile、Site Memory、履歴、会社Profile

## Data Model方針

既存の `vaultState` を正にする。

現行:

- `vault_profiles`
- `semantic_memory`
- `mapping_cache`
- `correction_events`
- profile内の `custom`, `custom_labels`, `custom_aliases`, `custom_categories`, `custom_order`

今後の拡張:

```json
{
  "version": 2,
  "active_profile_id": "personal_main",
  "vault_profiles": [
    {
      "profile_id": "personal_main",
      "label": "Personal main",
      "profile_type": "personal",
      "values": {
        "person": {},
        "company": {},
        "custom_entries": [
          {
            "entry_id": "entry_001",
            "key": "member_id",
            "label": "会員ID",
            "value": "A-12345",
            "aliases": ["member id", "customer no", "会員番号"],
            "category": "id",
            "usage_hint": "account_forms",
            "sensitivity": "normal",
            "created_from": "popup_detected_field",
            "updated_at": "2026-06-02T00:00:00.000Z"
          }
        ]
      }
    }
  ],
  "capture_inbox": [
    {
      "capture_id": "cap_001",
      "origin": "https://example.com",
      "field_signature": "label:紹介コード|name:referral",
      "suggested_label": "紹介コード",
      "aliases": ["referral", "invite code"],
      "status": "pending"
    }
  ]
}
```

移行方針:

- 既存の `custom_*` は壊さず読み続ける
- manager側で保存する時に `custom_entries` へ正規化する
- AI payloadには実値を入れず、`entry_id` / `profile_key` / label / alias / categoryだけを使う
- 暗号化方針は現行のAES-GCMを継続する

## UXルール

- popupは1フォームの作業だけに集中する
- full-pageは情報資産の管理に集中する
- どちらから保存しても、同じVaultへ即反映する
- 不明項目は、popupで即追加できる
- 迷う項目は、Capture Inboxへ逃がして後で整理できる
- AIへ送るpayload previewを見せる
- 入力プラン画面では `送信ボタンは押しません` を必ず見せる
- `profile_key` / `semantic_key` はユーザー向けUIに出さない
- 15分無操作の自動ロックを標準にする
- 送信ボタンは押さない
- CAPTCHA、SMS、メール認証、大量アカウント作成は扱わない
- AIに個人情報の実値を送らない

## 実装順

1. popupに `Open Vault Manager` ボタンを追加
2. `manager.html/js/css` を追加し、同じ `vaultState` を読み書きする
3. Saved Info Ledgerの検索/追加/編集/削除を実装
4. Capture Inboxを追加し、popupの未知項目追加から連携
5. 複数プロフィール管理をPlus以上へ接続
6. import/exportをPlus以上へ接続
7. Site Memory閲覧を追加
8. 実ブラウザE2Eでpopup保存とmanager保存の同期を確認

## 事業上の意味

popupだけだと、便利な自動入力ツールで終わる。

full-page Vault Managerがあると、ユーザーは自分の情報資産をFormPilotへためていく。これが課金理由になる。

最終的な価値は、`この人専用に育った入力台帳` です。ここが競合の普通の自動入力やパスワードマネージャーとの差になります。
