# プライバシーと安全方針

作成日: 2026-06-01

## 基本思想

このプロダクトは、ユーザー本人が、自分の情報を、自分が開いたフォームに、確認つきで入力するための補助ツールです。

## AIへ送ってよいもの

- tag
- type
- name
- id
- autocomplete
- placeholder
- label
- aria-label
- nearby text
- section title
- required
- select options
- URLのoriginとpathの粗い情報

## AIへ送らないもの

- 氏名の実値
- 住所の実値
- 電話番号
- メールアドレス
- パスワード
- 入力済み値
- Cookie
- localStorage/sessionStorage
- ページ本文全体
- 認証トークン

## 実行制限

- 送信ボタンを押さない
- 入力中はSafe Fill Modeでsubmit / Enter / submit button clickを一時ガードする
- 入力後30秒はUndo Stackで元の値へ戻せる
- CAPTCHAを回避しない
- SMS/メール認証を突破しない
- 大量登録を支援しない
- 金融/医療/行政/本人確認フォームはMVP対象外

## 高機密項目の扱い

MVPでは、以下の項目は既定で自動入力しない。

- パスワード
- クレジットカード番号
- 銀行口座
- 政府ID / マイナンバー / SSN相当
- CAPTCHA / SMS / メール認証コード / OTP

これらはSensitivity Tier 4として扱い、入力プランには `スキップ` として表示する。AIへは実値を送らず、Receiptsにも実値を保存しない。

## Chrome拡張の権限方針

- `activeTab` と `scripting` を優先する
- 常時全サイトのDOMを読む設計にしない
- ユーザーがボタンを押したタブだけ処理する
- APIキーは拡張機能に埋め込まない
- プロフィールDBは端末内を基本にする
