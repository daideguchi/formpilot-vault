# Professional UI/UX Review Decisions

作成日: 2026-06-02
状態: `accepted_and_p0_implemented`
対象: FormPilot Vault

## 結論

専門UI/UXレビューの判断を採用する。

FormPilot Vaultは、単なる自動入力ツールではなく、`個人情報の育成プラットフォーム` として設計する。

守る核:

- Form DOM理解
- `profile_key` 対応
- 暗号化Vaultから入力
- ユーザー確認
- 送信ボタンは押さない
- AIに個人情報の実値を送らない

## 総合評価

現在の方向性は強い。ただし、完璧ではない。

最大の弱点は以下。

- `Profiles` / `Saved Info Ledger` / `Capture Inbox` の関係がユーザー視点で曖昧
- `使うほど育つ` 体験がUI上で見えにくい
- popupに機能を詰め込みすぎる危険がある
- Free上限到達時の課金転換が `足りない` 軸に寄りすぎている
- `送信ボタンを押さない` と `AIに実値を送らない` という最強の信頼価値を、UIで証明できていない

## 採用する概念整理

UI上では、以下のモデルに統一する。

```text
Vault         = 暗号化ストレージそのもの。技術用語なので原則UIに出さない
Ledger        = ユーザーが持つ事実のフラットDB。ユーザーに見せる中心概念
Profiles      = Ledgerに対するビュー / ペルソナ。個人用、仕事用、家族用など
Capture Inbox = まだLedgerに入っていない未確定情報の受信箱
Site Memory   = サイト固有の入力慣習。Ledgerとは別レイヤー
```

ユーザー体験上は、`1つのLedger x 複数のProfile x サイトごとの記憶` として扱う。

比喩:

- Ledger = 本棚
- Profile = しおり / レンズ
- Capture Inbox = 未読箱
- Site Memory = サイト記録

## 最大のUXリスク

1. ユーザーがVault/Ledgerを育てない
2. AIに個人情報が送られていると誤解される
3. popupが機能過多になり、何も分かりにくくなる
4. Capture Inboxが死蔵される
5. 入力ミス時のリカバリーが弱い
6. `profile_key` / `semantic_key` などの内部用語がUIに漏れる
7. Free上限到達時の課金UXが弱い
8. Site Memoryが暗黒箱に見える
9. フォーム検出失敗時の説明が弱い
10. マスターロック / Passkey / タイマーロック設計が不足している

## 絶対に直すTop 10

| # | 問題 | 採用する直し方 |
|---|---|---|
| 1 | Profiles/Ledger/Inboxの関係不明 | Ledger/Profile/Inbox/Site Memoryの概念を固定する |
| 2 | popup機能過多 | popupは `検出 -> 確認 -> 入力` の3歩に絞る |
| 3 | AI送信内容の不透明 | `AIに送る情報をプレビュー` で値なしJSONを見せる |
| 4 | 暗号化の見えなさ | `ローカル暗号化中` とアンロック状態を常時表示する |
| 5 | 送信しない約束の弱さ | 入力プラン画面に `送信ボタンは押しません` を毎回表示する |
| 6 | フォーム検出失敗の沈黙 | iframe/Shadow DOM/動的ロード/対応不可など理由を分類表示する |
| 7 | 入力プランの差分不在 | 既入力値がある欄は `現在値 -> 新値` を表示する |
| 8 | 育成感の欠如 | `台帳項目数 / 学習サイト数 / 今月節約時間` を常設表示する |
| 9 | 課金転換の単軸 | `足りない` だけでなく `貯まった` 軸で課金訴求する |
| 10 | 多言語の表層対応 | UI翻訳だけでなく、フォーム側言語検出と入力形式変換を明示する |

## Popup設計の決定

popupは3歩のみ。

```text
検出 -> 確認 -> 入力
```

popupでやること:

- フォーム検出
- 入力プラン確認
- 自動入力
- 不明項目の最小解決
- `Open Vault Manager` への導線
- Trust状態の常時表示

popupから外すこと:

- 大量項目の整理
- 複数プロフィールの本格管理
- import/export
- サイト別memoryの詳細編集
- 履歴や監査ログ
- チーム共有管理

## Popup共通レイアウト

- ヘッダー固定: ロック状態、プロフィール切替、Manager導線
- 本体: 状態ごとの1画面
- フッター固定: `台帳 N / 学習 N / 今月 X/20` の育成バー
- 入力プラン画面では `送信ボタンは押しません` を必ず表示
- AI処理中は `AIに送るのはフォーム構造のみ` を必ず表示
- `AIに送る情報をプレビュー` で実際の値なしpayloadを表示する

## Full-page Vault Manager設計の決定

Full-page Vault Managerは、情報を育てる管理画面にする。

主要ナビ:

- Dashboard
- Profiles
- Ledger
- Capture Inbox
- Sites
- Activity
- Import / Export
- Plan
- Security
- Language

Dashboardでは、説明ではなく作業を開始できる状態を見せる。

表示する育成指標:

- 台帳エントリ数
- 学習済みサイト数
- 今月の入力回数
- 推定節約時間
- Inbox未処理数
- Privacy status

## Saved Info Ledgerの決定

Ledgerは `Notion Database x 1Password` の方向で設計する。

表示列:

- 種類
- 値
- ラベル
- 使用回数
- 最終使用
- ソース
- 信頼度
- 対応Profile

重要機能:

- 検索
- カテゴリ絞り込み
- 行追加
- 複製
- 並び替え
- 形式バリエーション
- alias登録
- 変更履歴
- import/export

内部の `semantic_key` はUIに出さず、`氏名`、`メール`、`電話` のような人間語に翻訳する。

## Capture Inboxの決定

Capture Inboxは `メールInbox x Linear Triage` として扱う。

目的は、未知項目や値の変更候補をLedgerへ昇格させること。

すべてのカードに4アクションを置く。

- 台帳に追加 / 上書き保存
- 別の種類 / ラベルで追加
- 1回限り
- 破棄 / 無視

Inbox Zeroを目標にする。

## Site Memoryの決定

Site Memoryは暗黒箱にしない。

表示する内容:

- domain
- 学習した傾向
- 入力回数
- 最終使用
- 信頼度
- 忘れさせるボタン

実値は表示しない。対応関係だけを見せる。

## 課金転換UX

Free -> Plusの訴求は3軸にする。

### 足りない軸

- Free 20回到達
- 残り3回予告

### 貯まった軸

- 台帳が30件を超えた
- Inboxが10件を超えた
- 今月の節約時間が見える
- 学習サイトが増えた

### 欲しい軸

- 2つ目のProfile作成
- Site Memory ON
- 入力履歴閲覧
- 会社プロフィール作成

重要:

- 値段を最初に出さない
- 価値 -> 値段の順で見せる
- `いつでも解約できます`
- `データは消えません`

## Trust / Privacy UX

信頼は3層で設計する。

```text
Promise  = UIで明示する約束
Evidence = その場で確認できる証拠
Control  = ユーザーが取れる行動
```

### Promise

- `ローカル暗号化中`
- `AIに値を送りません`
- `送信ボタンは押しません`

### Evidence

- AI送信payload preview
- 値なしJSONの表示
- AI送信ログ

### Control

- マスターロック
- 15分/1時間/手動ロック
- ドメイン除外
- エクスポート
- 緊急ワイプ

## ロック設計

採用方針:

- デフォルト: 15分無操作で自動ロック
- アンロック: Passkey / 生体認証 / マスターパスフレーズ
- ロック中: フォーム検出はできるが、Vault値は取得しない
- export / security設定変更時: 再認証必須

## 多言語・世界配信

UI翻訳だけでなく、フォーム側言語とVault側言語を分ける。

例:

```text
Vault言語: 日本語
フォーム言語: 英語
"First Name" -> "Taro"
```

必要な方針:

- semantic_keyの世界共通化
- ローマ字版、英訳、国際フォーマットをLedger entryに持たせる
- フォーム側地域/言語から形式を選ぶ
- `この欄は英語のようです。Taroで入力します` のように確認する
- RTL対応はv2以降で計画する
- WCAG 2.1 AAを基準にする

## 実装優先順位

### MVP

- popupの3歩化
- Trustバッジ
- AI送信payload preview
- `送信ボタンは押しません` 表示
- Free月20回
- その場でLedger追加
- 日本語/英語
- マスターロック

### v1

- Full-page Vault Manager
- Ledger完全版
- Capture Inbox
- 複数プロフィール
- import
- 入力差分表示
- 育成バー
- 多軸の課金転換UX
- 中韓言語追加

### v2

- Site Memory
- 会社プロフィール
- 入力履歴/監査ログ
- 長文補助
- 自動ルール
- encrypted backup export
- AIプロバイダ選択
- Team初期版
- 西/仏/独/葡/RTL初期対応

## 採用microcopy

### Trust

- JA: `ローカル暗号化中`
- EN: `Encrypted on this device`
- JA: `AIに値を送りません`
- EN: `AI never sees your values`
- JA: `これがAIに送る内容です。値は含まれていません。`
- EN: `This is what's sent to AI. No values included.`
- JA: `8項目を入力します。送信ボタンは押しません。`
- EN: `Filling 8 fields. Submit button will not be clicked.`

### Success

- JA: `8項目を入力しました。送信ボタンは押していません。内容を確認して送信してください。`
- EN: `Filled 8 fields. Submit button untouched. Please review before submitting.`
- JA: `台帳に追加しました。次回から自動で使えます。`
- EN: `Added to your ledger. Available for future forms.`

### Growth

- JA: `台帳が30件に育ちました。使うほど精度が上がります。`
- EN: `Your ledger now has 30 entries. It gets sharper as you use it.`
- JA: `今月の節約時間: 28分。Plusなら無制限に増やせます。`
- EN: `28 minutes saved this month. Plus removes the limit.`

### Upgrade

- JA: `今月の無料枠を使い切りました。あなたの台帳は47項目に育っています。Plusでフル活用できます。`
- EN: `Free quota reached. Your ledger has grown to 47 entries. Plus unlocks them all.`
- JA: `複数プロフィールはPlus機能です。仕事用と個人用を分けて管理できます。`
- EN: `Multiple profiles are a Plus feature. Keep work and personal separate.`
- JA: `いつでも解約できます。あなたのデータは消えません。`
- EN: `Cancel anytime. Your data stays.`

## 最終判断

このレビューを採用する。

今後のUI/UX実装では、以下を最優先にする。

1. 概念整理
2. popupの3歩化
3. Trust evidence
4. 育成感
5. 貯まった軸の課金転換

この順番を崩さない。

## P0実装記録

2026-06-02 13:49 JSTに、上記レビューのP0を実装済み。

実装したこと:

- popupを `検出 -> 確認 -> 入力` の3歩に再整理
- headerにVault Manager導線を追加
- `この端末で暗号化中` / `AIに値を送りません` を常時表示
- 入力プランに `送信ボタンは押しません` を表示
- AIに送る値なしpayload previewを追加
- 下部に `台帳 / 学習 / 今月 / 節約` の育成バーを追加
- Free上限到達文言を `台帳が育った` 軸へ変更
- full-page Vault Managerを追加し、Dashboard / Ledger / Profiles / Capture Inbox / Sites / Plan / Security / Languageを分離
- `capture_inbox` をVault正規化で保持するように変更
- i18nを204キー x 21 localeへ拡張
- `0.1.2` 次回提出候補ZIPを生成

検証:

- `npm test`
- `npm run test:extension`
- `npm run assets:store`
- `npm run package:extension`
- `npm run release:check`

証跡:

- `site/assets/real-extension-popup-loaded.png`
- `site/assets/real-extension-manager-dashboard.png`
- `dist/ai-form-autofill-0.1.2.zip`
