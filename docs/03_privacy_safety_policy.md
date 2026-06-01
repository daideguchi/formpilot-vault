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
- CAPTCHAを回避しない
- SMS/メール認証を突破しない
- 大量登録を支援しない
- 金融/医療/行政/本人確認フォームはMVP対象外

## Chrome拡張の権限方針

- `activeTab` と `scripting` を優先する
- 常時全サイトのDOMを読む設計にしない
- ユーザーがボタンを押したタブだけ処理する
- APIキーは拡張機能に埋め込まない
- プロフィールDBは端末内を基本にする

