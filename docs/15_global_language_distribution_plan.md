# Global Language Distribution Plan

作成日: 2026-06-01
状態: `active_launch_strategy`

## 結論

FormPilot Vaultは、日本語特化だけで閉じるより、最初から世界配信で出す方が売れる可能性が高いです。

理由は、痛みが日本だけのものではないからです。登録、問い合わせ、資料請求、無料トライアル、求人応募、イベント申込のフォーム入力は、国をまたいで同じように面倒です。

ただし、ここで言う言語対応は翻訳だけではありません。

```text
UI翻訳
  + Store Listing翻訳
  + LP/価格ページの英語軸
  + 各国フォームのラベル理解
  + locale_contextを使ったAI推論
  + 国別の住所・電話・郵便番号フォーマット
  + サイト別Memory
```

ここまでを合わせて、世界対応と呼びます。

## 売り方

Primary message:

```text
Multilingual form autofill that keeps your profile values local.
```

日本語では:

```text
登録フォーム、もう書かない。個人情報は端末内Vault、AIにはフォーム構造だけ。
```

## 市場優先順位

Tier 1は、課金しやすくフォーム作業が多い地域です。

- 英語圏: US / Canada / UK / Australia
- 日本: 日本語フォーム精度を差別化軸にする
- 欧州: Germany / France / Netherlands / Italy / Spain / Poland
- アジア高単価: Korea / Taiwan / Singapore / Hong Kong

Tier 2は、利用回数と拡散を取りに行く地域です。

- Latin America: `es_419`, `pt_BR`
- India: `hi`, English併用
- Southeast Asia: `id`, `th`, `vi`
- MENA / Turkey: `ar`, `tr`

## 実装方針

AIへはプロフィール実値を送らず、フォーム構造と `locale_context` を送ります。

`locale_context` は次の情報を持ちます。

- `ui_language`
- `page_language`
- `text_direction`
- `host_tld`
- `charset`
- `origin`

これは、右書き言語、地域ドメイン、ページ言語、住所/電話の表記ゆれを推論するためのヒントです。ただし、最優先は autocomplete、label、placeholder、name、id、select候補、サイト別Memoryです。

## 課金へのつなげ方

Freeは月5回のままにします。世界配信では、Freeを広く撒きすぎないことが重要です。

- Free: 月5回、1プロフィール、ローカル基本入力
- Plus: 無制限、複数プロフィール、サイト別Memory
- Pro: 会社プロフィール、住所複数、長い業務フォーム
- Team: チーム共有テンプレート、監査ログ、権限管理

言語対応そのものを単独課金にしません。国をまたいで使える便利さは、無制限入力・複数プロフィール・Memoryの価値を強くするための土台にします。

## リリース判断

初回提出は世界配信で進めます。Chrome Web Storeの配信地域は全155地域、package localeは21 locale、Primary languageは英語です。

提出を遅らせるほど損なので、Store Listingの全言語翻訳は公開後に追加します。MVP時点では、拡張UIとフォーム理解を先に世界対応させ、英語のStore Listingで世界公開します。

公開LPも同じ方針です。非日本語ブラウザでは英語を初期表示し、日本語ユーザーには `?lang=ja` と言語ボタンで日本語を出します。これにより、Chrome Web Storeから来た世界ユーザーが最初に日本語だけを見る状態を避けます。
