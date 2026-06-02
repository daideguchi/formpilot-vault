# Current Truth

更新日: 2026-06-02
事業名: `AIフォームオートフィル`
TASK候補: `BIZ-FORM-AUTOFILL-001`

## 現在地

新規事業として起動しました。最終ゴールは `リリース` と `マネタイズ` です。

事業の中心は、フォームを入力する人たちの細かな手間を、自動入力で解決することです。AIは前面に出す主役ではなく、バラバラなフォーム項目を理解して正しいプロフィール値へ対応づけるための裏側の力です。

最重要のコアコンセプトは `個人情報Vault + 入力判断用RAG/記憶スペース` です。単なる自動入力ではなく、ユーザーごとの個人情報、会社情報、入力の癖、サイト別の正解、過去の修正をためて、次のフォーム入力に使える状態を作ります。

MVPは `Chrome拡張 + content script入力` を本線にします。Playwrightは検証用と将来のB2B版に回します。

## 現時点の成果物

- Chrome拡張MVP: `extension/`
- フォーム認識エンジン: `extension/src/schema-engine.js`
- DOM収集/入力実行: `extension/src/collector.js`
- 郵便番号住所検索: `extension/src/postal-code-client.js`
- API切替方針: `extension/src/provider-router.js`
- AI安全ペイロード: `extension/src/ai-payload.js`
- Extension schema API client: `extension/src/schema-client.js`
- AI schema proxy: `api/schema-proxy/`
- entitlement API: `api/entitlement/`
- サンプルフォーム検証: `tests/`
- 実ブラウザ拡張E2E: `tests/extension-real-browser-e2e.mjs`
- 公開デモフォーム実ブラウザ検証: `tests/public-site-real-browser-probe.mjs`
- リリース/課金計画: `docs/`
- Free/Plus/Pro/Teamの利用制限: `extension/src/usage-meter.js`
- Vault/RAGコア設計: `docs/08_profile_vault_rag_core.md`
- Vault登録UX設計: `docs/18_vault_registration_ux_architecture.md`
- 専門UI/UXレビュー採用判断: `docs/19_professional_uiux_review_decisions.md`
- Vault/RAG最小DB: `extension/src/profile-memory.js`
- Vault実値暗号化: `extension/src/vault-crypto.js`
- Chrome Web Store素材: `store-assets/`
- 拡張アイコン: `extension/icons/`
- 提出用ZIP: `dist/ai-form-autofill-0.1.1.zip`
- ストア掲載文面: `docs/12_chrome_store_listing_copy.md`
- Chrome Web Store提出パケット: `docs/14_chrome_web_store_submission_packet.md`
- プライバシー/利用規約下書き: `site/privacy.html`, `site/terms.html`
- Cloudflare Worker本番入口: `api/worker/worker.mjs`
- D1 entitlement migration: `api/worker/migrations/0001_entitlements.sql`
- Cloudflare deploy設定: `wrangler.toml`
- 本番リリースRunbook: `docs/13_production_launch_runbook.md`
- release readiness check: `scripts/release-readiness.mjs`
- production connection check: `scripts/check-production-connections.mjs`
- paid license live check: `scripts/check-paid-license-live.mjs`
- launch status check: `scripts/check-launch-status.mjs`
- SEO readiness check: `scripts/check-seo.mjs`
- 公開LP/GitHub repo: `https://daideguchi.github.io/formpilot-vault/`, `https://github.com/daideguchi/formpilot-vault`
- 本番LP/API: `https://formpilot-vault-api.vercel.app/`
- 日本語SEOページ: `https://formpilot-vault-api.vercel.app/ja`
- フォーム入力SEO専用ページ: `https://formpilot-vault-api.vercel.app/form-input`
- フォーム自動入力SEO専用ページ: `https://formpilot-vault-api.vercel.app/form-autofill`
- 会員登録自動入力SEO専用ページ: `https://formpilot-vault-api.vercel.app/signup-autofill`
- 問い合わせフォーム自動入力SEO専用ページ: `https://formpilot-vault-api.vercel.app/contact-form-autofill`
- SEO sitemap: `https://formpilot-vault-api.vercel.app/sitemap.xml`
- Stripe本番Checkoutブリッジ: `https://kurogane-edge-core-lp.vercel.app/api/formpilot/*`
- Extension UI locales: `en`, `en_GB`, `ja`, `es`, `es_419`, `fr`, `de`, `it`, `nl`, `pl`, `pt_BR`, `ru`, `tr`, `ar`, `hi`, `id`, `th`, `vi`, `ko`, `zh_CN`, `zh_TW`
- Worldwide distribution方針
- Chrome Web Store draft item: `kmlcabffhmenjajmlnkkglphjnbaahlf`

`extension/src/profile-memory.js` で、ローカルVault、サイト別mapping cache、ユーザー修正イベント、フォーム単位のmemory retrievalを実装済みです。`extension/src/vault-crypto.js` でプロフィール実値をAES-GCM暗号化して `chrome.storage.local` へ保存します。暗号鍵はIndexedDBの非exportable `CryptoKey` として分離し、`chrome.storage.local` には鍵も実値も置きません。入力成功後、実値ではなく `profile_key` とフィールド署名だけを保存して、次回の推論に使います。

既存の平文Vault/旧 `profile` storageは、popup初回起動時に復号可能なruntime stateへ読み込み、暗号化済み `vaultState` へ自動移行します。実ブラウザE2Eでは、入力後のChrome拡張storageにプロフィール実値が平文で残らないことを確認済みです。

popup上で不確定項目をプロフィールキーへ紐づける `Learn` UIも実装済みです。これにより、ユーザー修正を `correction_events` と `mapping_cache` に保存し、同じフォームでは次回からMemory優先で入力プランへ反映します。

台帳登録UXの方針として、popupはフォーム上で未知項目をその場登録するQuick Captureに寄せ、たくさんの情報を登録・整理したいユーザーにはブラウザ全体で使うfull-page Vault Managerを用意します。どちらも同じ暗号化 `vaultState` を読み書きし、別DBにはしません。詳細設計は `docs/18_vault_registration_ux_architecture.md` に固定しました。

2026-06-02に専門UI/UXレビューを採用し、`docs/19_professional_uiux_review_decisions.md` へ正本化しました。以後のUI/UXは、popupを `検出 -> 確認 -> 入力` の3歩へ絞る、ユーザー向け中心概念を `Ledger` に寄せる、`Profile` はLedgerのビュー、`Capture Inbox` は未確定情報、`Site Memory` はサイト固有の入力習慣として扱う、という方針で進めます。Trust UXとして、AI送信payload preview、`送信ボタンは押しません` の毎回表示、ローカル暗号化状態、15分無操作ロックを優先します。課金転換はFree上限だけでなく、Ledger項目数、学習サイト数、節約時間、Inbox件数など `貯まった` 軸でも設計します。

AIへ渡すschema inference payloadも実装済みです。フォーム構造、Memory context、ページ言語、UI言語、ブラウザ言語、TLD、タイムゾーン、calendar、numbering systemなどの `locale_context` は渡しますが、input value、CSS selector、プロフィール実値は入れないテストを固定しています。

リリース/課金に必要なAPI土台も実装済みです。`api/schema-proxy/` はAzure DeepSeek V4からCloudflare Workers AIへ日付で切替し、`api/entitlement/` はStripe webhookとlicense checkを扱います。popupにはLicense key確認欄を追加済みです。2026-06-01 13:28 JSTに、拡張popup本体も `extension/src/schema-client.js` 経由で本番schema APIを優先利用する形へ変更しました。API失敗時はローカルルールへfallbackします。

DDの初期思想は実際のschema proxyプロンプトへ入れました。`buildSchemaPrompt()` は、フォーム入力の細かな手間をなくす、Personal Vault + Profile RAG/Memory Spaceを核にする、実値を扱わない、不確定項目はユーザー確認へ残す、送信/認証突破/大量作成はしない、世界市場のフォームでは `locale_context` を補助情報として使う、という方針を含みます。

Stripe Checkout作成APIとLP側の決済導線も実装済みです。Plus/Pro/Teamボタンから `POST /api/stripe/checkout-session` を呼び、Checkout成功後にLicense keyを表示します。2026-06-01時点では、FormPilot本番APIがKurogane側のStripe本番secretを使う専用ブリッジへ中継し、Stripe Checkout Session作成まで本番で成功しています。2026-06-01 13:40 JSTにPlus/Pro/Teamの3プランすべてで `cs_live_` Checkout Session作成を確認しました。購入前のlicense checkはFree/月20回で返り、購入後はStripe subscription metadataの `license_key` / `plan` を照会して有料権利を返す設計です。2026-06-02 10:45 JST時点で、Checkout successページはLicense key表示だけでなく `/api/entitlement/check` を即時確認し、有料active/反映待ち/確認失敗を表示する導線へ強化済みです。

実購入後の有料権利確認用に `npm run check:paid-license` を追加しました。`AFA_LICENSE_KEY=afa_xxx AFA_EXPECTED_PLAN=plus npm run check:paid-license` で、Vercel本番とCloudflare Worker本番の両方に対して、有料plan、active状態、月間fills権利を確認できます。

実購入テスト開始用に `npm run purchase:verify` も追加しました。`npm run purchase:verify -- --plan plus --open --wait` で、本番Checkout Sessionを作成し、Stripe Checkoutを開き、DDが支払い完了後に購入済みLicense keyがVercel本番とCloudflare Worker本番の両方で有料activeになるまで待機確認できます。2026-06-02 10:52 JSTに、支払いなしでPlusの本番Checkout Session作成まで通過し、`cs_live_` session id、Checkout URL、success URLが出ることを確認しました。

審査中/公開後/購入後を一括確認する `npm run check:launch` も追加しました。通常モードではVercel、Cloudflare、GitHub Pages、Chrome Web Store公開URL、Chrome Web Store Dashboard、購入後ライセンスの状態をまとめて出し、審査待ち中の未公開URLと未購入ライセンスはwarning扱いにします。公開後は `-- --require-published`、実購入後は `-- --require-paid-license` を付けてブロッカー化できます。

2026-06-01 14:01 JST時点で `npm run check:launch` はブロッカー0です。Vercel health、Cloudflare health、GitHub Pages、Chrome Web Store Dashboard `審査待ち` を確認し、Chrome Web Store公開URLは未公開のためwarning、実購入license未投入もwarningです。`--require-published` は未公開をブロッカー化し、`--require-paid-license` は未購入/無効licenseをブロッカー化することも確認済みです。

2026-06-01 15:56 JST時点でSEO公開面を強化済みです。英語トップに `AI form autofill Chrome extension` 向けのtitle/meta/本文/JSON-LDを追加し、日本語は `https://formpilot-vault-api.vercel.app/ja` を作って `フォーム入力`、`フォーム自動入力`、`Chrome拡張`、`AI自動入力` の検索意図へ合わせました。`robots.txt` と `sitemap.xml` も追加し、canonical/hreflangはVercelの最終到達URLに合わせています。`npm run check:seo -- --live`、`npm run check:production`、`npm run release:check` はブロッカー0です。Playwright実ブラウザでも英語desktopと日本語mobileの横スクロールなしを確認しました。公開repo `daideguchi/formpilot-vault` へcommit `0fa2cc8 Add SEO launch surfaces` をpushし、GitHub Pages build/deploy成功、`/`、`/ja.html`、`/robots.txt`、`/sitemap.xml` のHTTP 200とSEO head/Pendo snippet配信を確認済みです。

2026-06-02 10:01 JSTに、公開repo `daideguchi/formpilot-vault` へFree月20回、`0.1.1`、CWS更新審査待ち、登録台帳/ZipCloud/電話番号3分割UI、SEO、Pendo/Novus維持を同期しました。commitは `486b44f Ship Free limit and CWS review update`、`d02e772 Fix public demo overflow`、`4cf1301 Record public release sync` です。GitHub Pages build/deployは最新commitで成功し、`https://daideguchi.github.io/formpilot-vault/`、`/ja.html`、`/demo.html`、`/robots.txt`、`/sitemap.xml` はHTTP 200です。公開トップ/日本語ページはPendo snippet、Free月20回、SEO語句を確認済みで、`npm run novus:public` はトップとdemoのPendo request、`pendo.initialize`、横スクロールなしを確認して通過しました。

2026-06-02 10:07 JSTにGoogle Search Consoleへ本番URL prefix `https://formpilot-vault-api.vercel.app/` を追加し、HTML file `google429836ef33603a29.html` で所有権確認を通しました。確認ファイルはVercel本番でHTTP 200です。Search Consoleへ `/sitemap.xml` を送信し、送信自体は成功しましたが、初回読み込みステータスは `取得できませんでした` です。外部確認ではGooglebot UAでも `https://formpilot-vault-api.vercel.app/sitemap.xml` はHTTP 200 / `application/xml` なので、Search Console側の再取得を後続確認対象にします。

2026-06-02 10:21 JSTに、検索語 `フォーム入力` / `フォーム自動入力` / `会員登録 自動入力` へより直接合わせるため、日本語SEO専用ページ `https://formpilot-vault-api.vercel.app/form-input` を追加しました。canonical、hreflang、OG/Twitter、SoftwareApplication + FAQPage JSON-LD、Free月20回、暗号化Vault、送信しない安全性、会員登録/問い合わせ/資料請求フォームの本文を入れています。`sitemap.xml` へ `/form-input` を追加し、`npm run check:seo -- --live` はブロッカー0です。Vercel deploymentは `dpl_o8Jak85iGAF83QBBFmBswq4r2GQE` です。Search Console URL検査では `/form-input` は `URL が Google に登録されていません` で、インデックス登録リクエストを試しましたが `1日の割り当て量を超えています` と表示されたため、明日以降の再リクエスト対象です。

2026-06-02 10:27 JSTに、公開repo `daideguchi/formpilot-vault` へ `/form-input.html` と `site/form-input.html` を同期しました。commitは `51a452e Add form input SEO page` です。GitHub Pages build/deploy run `26792599595` は成功し、`https://daideguchi.github.io/formpilot-vault/form-input.html` と `/sitemap.xml` はHTTP 200です。`npm run novus:public` は `/`、`/form-input.html`、`/demo.html` でPendo request、`pendo.initialize`、横スクロールなしを確認して通過しました。

2026-06-02 10:33 JSTに、SEO内部リンクを追加しました。Vercel本番のトップ/日本語ページから `form-input` へ、GitHub Pages公開ミラーのトップ/日本語ページから `form-input.html` へ自然なテキストリンクを張っています。Vercel deploymentは `dpl_GY7n8bUsLzMUn4hbFeJnPoNLTnXm` です。公開repo commitは `cce223c Link home pages to form input SEO page`、GitHub Pages deploy runは `26792823545` です。`npm run check:seo -- --live`、`npm run check:production`、`npm run novus:public` はブロッカー0で通過しました。

2026-06-02 11:05 JSTに、SEOロングテールページを追加しました。`https://formpilot-vault-api.vercel.app/form-autofill` は `フォーム自動入力`、`https://formpilot-vault-api.vercel.app/signup-autofill` は `会員登録 自動入力`、`https://formpilot-vault-api.vercel.app/contact-form-autofill` は `問い合わせフォーム 自動入力` / `資料請求フォーム 自動入力` を狙います。各ページはtitle/meta、canonical、hreflang、OG/Twitter、SoftwareApplication + FAQPage JSON-LD、Free月20回、暗号化Vault、AIに個人情報実値を送らない、送信しない安全性を含みます。`sitemap.xml` に3URLを追加し、トップ/日本語/フォーム入力ページから内部リンクを張りました。Vercel deploymentは `dpl_GBRpH16xHpyhWVFqWhjRaEinr11u` です。`npm run check:seo -- --live`、`npm run check:production`、`npm run check:launch -- --require-published` はブロッカー0で通過し、Googlebot UAで`sitemap.xml` はHTTP 200 / `application/xml` です。公開repo commitは `0c4be7d Add SEO keyword landing pages`、GitHub Pages deploy runは `26793869132` で成功し、`/form-autofill.html`、`/signup-autofill.html`、`/contact-form-autofill.html` はHTTP 200、`npm run novus:public` は全対象ページでPendo requestと横スクロールなしを確認して通過しました。

2026-06-02 11:31 JSTに、SEO流入から課金への導線を短くしました。`/form-input`、`/form-autofill`、`/signup-autofill`、`/contact-form-autofill` の各ページにFree/Plus/Pro/Teamの料金カードとPlus/Pro/Team Checkoutボタンを直接追加し、検索流入ページから `ja.html#pricing` へ戻らなくてもStripe Checkoutへ進めるようにしました。`site/pricing.js` はトップページ以外ではtitle/langを書き換えず、Checkout処理だけを使うように修正済みです。Vercel deploymentは `dpl_BHoz4wbEmubUbJodJKkjcgdefjm2` です。`npm run test`、`npm run check:seo -- --live`、`npm run check:production`、`npm run check:launch -- --require-published` はブロッカー0で通過し、`npm run purchase:verify -- --plan plus` は支払いなしでPlusの `cs_live_` Checkout Sessionを作成できることを確認しました。`/success` はHTTP 200、`/success.html` はVercelで`/success`へ308 redirectされ、Checkout成功後の戻り先も到達可能です。

2026-06-02 10:45 JSTに、課金成功後のライセンス導線を強化しました。`site/success.html` / `site/success.js` は、License keyを表示し、コピーし、`/api/entitlement/check` で有料権利のactive状態を即時確認し、反映待ちの場合は再確認できるようにしています。GitHub Pages公開ミラーからも本番Vercel APIへ届くよう、`pricing.js` と `success.js` は `github.io` 上では `https://formpilot-vault-api.vercel.app` をAPI baseにします。Vercel deploymentは `dpl_6G3NQHHE4BhuenCtkZqcXvMqqYF9` です。公開repo commitは `d83584b Harden paid license success flow`、GitHub Pages deploy runは `26793230495` です。`npm test`、`npm run test:checkout-site`、`npm run check:production`、`npm run check:seo -- --live`、`npm run novus:public` は通過済みです。`npm run novus:public` は `/success.html?license_key=afa_public_probe_success` でもPendo request、`pendo.initialize`、横スクロールなしを確認しています。

公開LPは世界配信向けに、非日本語ブラウザでは英語を初期表示します。日本語は `?lang=ja` または言語ボタンで表示できます。2026-06-01 12:45 JSTの本番確認では、英語初期表示、英語Plusボタン、日本語モバイル表示、横スクロールなし、Stripe Checkout導線が通っています。

AI schema proxyは、Azure/Cloudflareの実環境変数が未投入でも停止しないように `rules_fallback` を実装済みです。さらに2026-06-02 12:17 JSTに、Vercel本番ではAzure環境変数が未設定の場合、先にCloudflare Workerのlive schema APIへ委譲するfallbackを追加しました。2026-06-06まではprovider routing上のprimaryは `azure_deepseek_v4` のままですが、Vercel本番の実応答は `provider_id: cloudflare_workers_ai_free`、`mode: live`、`delegated_from_provider_id: azure_deepseek_v4`、`delegated_from_error: azure_env_missing` で通過しています。`rules_fallback` はAzureとCloudflare live委譲の両方が使えない時の最後の継続手段として残します。

多言語対応も初回提出前に強化しました。manifestは `default_locale: en` と `_locales` を使うChrome公式i18n構成で、21 localeに対応します。対象は英語、英語UK、日本語、スペイン語、ラテンアメリカスペイン語、フランス語、ドイツ語、イタリア語、オランダ語、ポーランド語、ブラジルポルトガル語、ロシア語、トルコ語、アラビア語、ヒンディー語、インドネシア語、タイ語、ベトナム語、韓国語、中国語簡体、中国語繁体です。2026-06-02 08:36 JST時点でExtension UIは152キー x 21 localeで欠落なしです。フォーム認識ルールも主要グローバル市場の氏名、メール、電話、国番号、郵便番号、国、住所、会社、部署、役職、パスワードに広げています。世界配信の販売戦略は `docs/15_global_language_distribution_plan.md` を正本にし、UI翻訳だけでなく国別フォーム理解、`locale_context`、Memory学習までを言語対応に含めます。

2026-06-01のDD判断として、世界配信は初期戦略に昇格しました。日本語フォームの強さは残しつつ、英語Primary、全155地域配信、21 locale拡張UI、英語初期LP、国別フォーム理解、Free月20回からの有料転換をセットで進めます。

Chrome Web Store提出向けのロゴ、manifestアイコン、小プロモ画像、1280x800スクリーンショット3枚、提出用ZIPを作成済みです。素材生成は `npm run assets:store`、ZIP作成は `npm run package:extension` で再現できます。2026-06-02 09:47 JST時点の更新用ZIPは、JSONではない登録情報フォーム、初期値を空にしてプレースホルダーで例を出すUI、電話番号3分割、郵便番号から住所を検索するZipCloud連携、保存後の `登録しました` 表示、自由追加できる登録台帳、3ステップ導線 `登録 / 確認 / 入力` の選択不可表示、登録台帳の見つけやすいタブUI、辞書検索、種類、よく使う辞書追加ボタン、フォーム確認で見つけた未登録項目をその場で台帳登録し追加行へ移動・強調する導線、Free月20回、フォーム未検出時の明示メッセージ、対応値が分かる解析結果表示、小さいpopup UI、平易な説明文、本番schema API優先、21 locale/152キー、国/国番号semantic key、拡張 `locale_context` 収集入りで `105168 bytes` です。

Chrome Web Store Dashboardにはitem `kmlcabffhmenjajmlnkkglphjnbaahlf` を作成済みです。21 locale ZIPをアップロードし、Store Listing、Privacy、販売地域、テスト手順を入力保存済みです。Primary languageは英語、UI localeは21 locale、カテゴリは `Workflow and Planning`、販売地域は全155地域、決済表示はStripe有料導線に合わせて `In-app purchases`、公開設定は `Public` です。Store Listingの短い説明/詳細説明とTest instructionsも、`repeated name/address/email typing`, `saved info`, `Check this form`, `Fill matching fields` へ統一済みです。2026-06-02 08:36 JSTの `npm run check:launch -- --require-published` 実測でChrome Web Store公開URLは `published: true`、final_urlは `https://chromewebstore.google.com/detail/formpilot-vault/kmlcabffhmenjajmlnkkglphjnbaahlf`、ブロッカー0です。Dashboard tabは未検出のためDashboard内Package版は未確認です。

2026-06-02 09:40 JSTに、DDの「Freeは月20回で課金させたい」という方針へ戻すため、拡張内usage meter、API entitlement、LP/Terms、Chrome Store文面、検証スクリプト、正本をFree月20回へ統一しました。2026-06-01 18:10 JST以降に進んでいた登録台帳のプレースホルダー、3ステップ導線、設定内タブ、台帳検索、種類、よく使う辞書追加ボタン、ZipCloud住所検索、電話番号3分割、空の初期値とプレースホルダー、保存後の `登録しました` 表示は維持します。公開済みChrome Web Storeの更新用にmanifest/package versionを `0.1.1` へ上げ、`npm test`、`npm run assets:store`、`npm run package:extension`、`npm run release:check` を通過しました。

Chrome Web Storeは、2026-06-02 08:36 JST時点で公開済みです。公開URLは `https://chromewebstore.google.com/detail/formpilot-vault/kmlcabffhmenjajmlnkkglphjnbaahlf`。2026-06-02 09:47 JSTに更新用ZIP `dist/ai-form-autofill-0.1.1.zip` をDashboardへアップロードし、更新審査へ送信済みです。Dashboard読み戻しでは、全体ステータスは `審査待ち`、ドラフトは `0.1.1`、公開済み版は `0.1.0` です。審査通過後に `0.1.1` が公開反映されます。

Stripe商品/価格の作成スクリプトは `npm run setup:stripe:dry` でdry-run通過済みです。現行本番はFormPilot専用Stripe bridgeでPlus/Pro/Teamの本番Checkout Sessionを作る構成です。実購入/入金確認だけは未実行で、DDの決済操作またはStripe Dashboard確認が必要です。

2026-06-02 12:04 JSTに、DD指定のプロモーションコードをStripe Checkoutへ適用し、Plusの0円Checkoutを完了しました。Stripe画面上は `今日期日の合計額 ￥0`、`1カ月間 100% 割引`、`その後、￥580/月、来月以降` の表示でした。Checkout成功後、license key `afa_purchase...eb0f` はVercel本番とCloudflare Worker本番の両方で `plan: plus`、`active: true`、`monthly_fills: unlimited` を返しました。`current_period_end` は `2026-07-02T03:02:05.000Z` です。`npm run check:paid-license` と `npm run check:launch -- --require-published --require-paid-license` はブロッカー0で通過しました。これは0円Checkoutなので即時入金は発生していませんが、本番Checkout、Stripe subscription metadata、Webhook/bridge由来の有料entitlement、成功ページUIのPlus表示まで確認済みです。

本番APIの置き場としてCloudflare Workerを実装済みです。`/api/schema/infer`、`/api/stripe/checkout-session`、`/api/stripe/webhook`、`/api/entitlement/check`、`/api/health` を同じWorkerで扱います。Stripe entitlementはD1に保存する設計です。Workers AI binding `env.AI.run()` がある場合はCloudflare API tokenなしで推論できます。Cloudflare CLIは `dd.1107.11107@gmail.com` でlogin済み、D1 `ai-form-autofill-prod` はAPACに作成済み、database_idは `895767fa-8bc7-4811-9801-63d879eeb194` です。D1 migration適用済みで、Worker本番URLは `https://ai-form-autofill.dd-1107-11107.workers.dev` です。2026-06-02 09:47 JST時点のCloudflare Worker version idは `a1c1eca3-084f-4a44-a5e1-1264227ab73e` です。

`npm run release:check` も追加済みです。Vercel本番APIを使う通常リリース判定ではブロッカー0です。Cloudflare用は `npm run check:cloudflare:live` で、Worker health、Workers AI live schema、Stripe Checkout bridge、Free entitlement bridgeを検証します。

`npm run check:production` も追加済みです。本番 `https://formpilot-vault-api.vercel.app` に対して、health、schema inference、Plus/Pro/Team Stripe Checkout sessions、Free entitlement、Privacy、Support、Termsを一括確認します。2026-06-02 09:47 JSTの確認では、Azure env未投入によりAI schema inferenceだけ `rules_fallback` warningでしたが、2026-06-02 12:17 JSTの再デプロイ後はCloudflare Worker live委譲により `npm run check:production:strict-ai` もブロッカー0/警告0で通過しています。

2026-06-02 12:17 JSTにVercel本番を再デプロイしました。deployment idは `dpl_HMAXzQgody4kr7zCQ6CLSCHo97US`、production aliasは `https://formpilot-vault-api.vercel.app` です。`npm run check:production:strict-ai` はブロッカー0/警告0で通過し、schema inferenceはCloudflare Worker liveへ委譲されました。`npm run check:seo -- --live`、`npm run check:cloudflare:live`、`npm run check:launch -- --require-published` も通過しました。Plus/Pro/TeamのCheckout Sessionはいずれも `cs_live_`、Free entitlementは月20回、Chrome Web Store公開URLはpublished、Dashboard上の `0.1.1` は引き続き `審査待ち` です。有料licenseの生値は公開正本に残していないため、この12:17 JSTの再検証では `--require-paid-license` は再実行していません。12:04 JSTの0円Plus Checkout検証記録は有効です。

2026-06-02 12:32 JSTに本番状態を再確認しました。`npm run check:production:strict-ai`、`npm run check:cloudflare:live`、`npm run check:seo -- --live`、`npm run check:launch -- --require-published` はすべてブロッカー0です。Chrome Web Store公開URLはpublished、Dashboard上の `0.1.1` は `審査待ち` です。FormPilot本番経由のFree entitlementは月20回で返っています。Stripe bridge生コード側にもFree月20回を合わせるため、Kurogane bridgeの `planLimits.free.monthly_fills` を20へ修正し、`npm run typecheck` 通過を確認しました。FXProject側のローカルcommitは `264ef2dc6 Align FormPilot Free entitlement limit` です。ただしKurogane bridgeの直接本番URLは未デプロイのため、直叩きではまだ月5回を返します。FormPilot/Vercel/Cloudflare側はFree20へ正規化しているため、公開運用上のブロッカーではありません。0円Plus Checkoutは本番課金導線の実機検証として有効ですが、即時入金は発生していません。次回請求を発生させない運用にする場合、`current_period_end` の `2026-07-02T03:02:05.000Z` より前にStripe Dashboardでキャンセル、または100%割引を継続する設定確認が必要です。

公開用LPは `FormPilot Vault` としてVercel本番へ反映済みです。`https://formpilot-vault-api.vercel.app/` はHTTP 200を確認済みです。2026-06-02 12:17 JSTにVercel deployment `dpl_HMAXzQgody4kr7zCQ6CLSCHo97US` を本番aliasへ反映し、Free月20回、SEOページ、Search Console確認ファイル、`/form-input` SEOページ、schema proxy、Stripe bridge経路、Checkout success上の有料権利確認、Azure未投入時のCloudflare live schema委譲を本番へ反映しました。GitHub Pages版 `https://daideguchi.github.io/formpilot-vault/` も公開ミラーとして維持し、`github.io` 上のCheckout/Entitlement API呼び出しはVercel本番へ向けています。

Cloudflare移行用に `npm run check:cloudflare` と `npm run check:cloudflare:live` を追加済みです。2026-06-02 09:47 JST確認時点でCloudflare login、D1 database作成、migration、Worker deploy、Workers AI binding本番確認、Stripe bridge secret設定まで完了しています。`npm run check:cloudflare:live` はブロッカー0で、Cloudflare schema live、Stripe checkout bridge、Free entitlement月20回を確認済みです。現在のChrome Web Store提出用本番は引き続きVercel + Stripeブリッジですが、Cloudflare Workerへ切り替え可能な本番経路も検証済みです。

Azure CLIは `degutidai@gmail.com` でログイン済みです。既存Azure AI Servicesは `degutidai-1418-resource` と `degutidai-5815-resource` の2つが見えますが、2026-06-01確認時点では両方ともmodel deploymentが空です。Azure側では `DeepSeek-V4-Pro` と `DeepSeek-V4-Flash` のmodel listは見えますが、deployment作成は subscription `8bf38da5-83a9-4f59-b2f9-1b7cc66fc64d` が `ReadOnlyDisabledSubscription` のため失敗しました。Azureを6/6までlive利用するには、Azure subscriptionの再有効化が人間停止点です。

実ブラウザ検証も通過済みです。Chromiumに拡張を `--load-extension` で読み込み、extension service worker / content script / DOM入力まで実行しました。14項目収集、14項目入力、初期登録情報が空でプレースホルダーだけ表示されること、郵便番号 `1500001` から住所が自動入力されること、保存後に `登録しました` が表示されること、電話番号が `090 / 1234 / 5678` の3分割で表示されること、3ステップ導線の選択不可表示、登録台帳タブ、台帳検索、辞書追加ボタン、登録台帳の `会員ID` / `紹介コード` / `スプレッドシート項目`、設定ボタン内の `登録台帳` 表示、台帳説明文、Plus license表示、`locale_context` 収集、IndexedDB内の非exportable Vault鍵、`chrome.storage.local` に鍵/実値なしまで確認済みです。フォーム確認で見つけた未登録項目を、その場で台帳へ追加する導線も入っています。証跡は `docs/10_real_browser_verification.md` と `site/assets/real-extension-*.png` にあります。

公開デモフォームでも実ブラウザ検証済みです。`httpbin.org/forms/post` は12項目収集、4項目入力。`selenium.dev/selenium/web/web-form.html` は14項目収集、1項目入力。送信はしていません。不確定項目をaskへ残す挙動も確認しました。

## API切替の正本

- 2026-06-01 から 2026-06-06 までは `Azure DeepSeek V4`
- 2026-06-07 以降は `Cloudflare Workers AI` の無料枠モデル
- Chrome拡張にAPIキーを入れない
- APIはサーバー/Worker側のプロキシで呼ぶ
- AIへ送るのはDOM由来のフォーム構造だけ

## MVPの公開範囲

対象にするフォーム:

- 会員登録
- 資料請求
- 問い合わせ
- イベント申込
- 無料トライアル登録

避けるフォーム:

- 金融
- 医療
- 行政
- 決済
- 本人確認
- CAPTCHAや不正対策が強い登録

## 未完了

- Chrome Web Store `0.1.1` 更新審査の結果確認と公開反映確認
- Azure subscription再有効化、またはAzure期間をCloudflare live委譲で運用し続ける最終判断
- Stripeの実購入/入金確認。0円Plus Checkoutは実機検証として完了済みだが、実売上ではない
- 0円Plus subscriptionの将来請求回避確認。次回請求を発生させない場合は、2026-07-02T03:02:05.000Zより前にStripe Dashboardでキャンセルまたは割引継続設定を確認する
- Kurogane bridge直接本番URLのFree月20回反映。FormPilot本番は正規化済みで月20回を返すが、bridge直叩きは未デプロイのため月5回を返す。汚れた作業ディレクトリを巻き込むローカルデプロイは避け、安全なbridge反映手順で進める
- サイト別マッピングUI
- 入力判断用RAG/Memory Spaceの実サイト評価

## 2026-06-01 ハッカソン転用確認

DDから、今作っている入力フォーム自動入力プロダクトを、賞金化しやすいハッカソンへ使いたいという方針を受けた。

確認結果:

- Mind the Productは最優先。`FormPilot Vault` として、実際に使えるChrome拡張/LP/Novus.ai/2〜3分動画へ寄せる。
- UiPath AgentHackは2本目。`Form Intake Case Room` として、AI入力案、人間確認、例外管理、監査ログへ寄せる。
- Google Cloud Rapid Agentは3本目。締切が近く競争が強いため、既存Google提出資産へフォーム作業ストーリーを統合できる場合だけ攻める。

今回の確認で `npm test`、`npm run test:worker`、`npm run test:extension`、`npm run test:public-probe`、`npm run assets:store`、`npm run package:extension`、`npm run release:check`、`npm run setup:stripe:dry` は通過した。
`tests/site-checkout-smoke.mjs` はPlaywrightの通常click待機が不安定だったため、checkout clickイベントを直接発火する形へ修正し、`npm test` が通る状態へ戻した。

LPもハッカソン審査員向けに更新した。日本語/英語切替、30秒確認導線、誰のため/何の課題/どう動く/何が証拠の4カードを追加し、余白を減らした。

詳細: `docs/11_hackathon_submission_strategy.md`

## 2026-06-01 FormPilot Vault 公開パッケージ

Mind the Product向けの別提出候補として、公開用パッケージを作成し、独立GitHubリポジトリへpushした。

- 公開URL: `https://daideguchi.github.io/formpilot-vault/`
- GitHub: `https://github.com/daideguchi/formpilot-vault`
- 公開パッケージ作業場所: `/Users/dd/000_AI組織/__hackason/formpilot-vault-public`
- 公開repoは継続更新中。提出前は `git log --oneline -5` と公開URLで最新状態を再確認する。

公開前に削った/直したこと:

- 公開用READMEから内部パスや個人文脈を除去
- 内部名を公開向けの `PRODUCT_CORE_PROMPT` へ変更
- 秘密情報スキャンで、Gmail、APIキー、クレジットコード、ローカルパスの混入なしを確認
- 英語表示時のページタイトルと料金表記を英語化
- 英語表示用のフォームプレビュー画像 `product-preview-en.png` を作り、日本語UIと英語UIを分離
- 事業側で進んでいた Cloudflare Worker、D1 migration、Privacy/Terms、Chrome Store提出コピー、release check も公開リポジトリへ反映

検証結果:

- `npm test` 通過
- `npm run test:extension` 通過
- `npm run test:public-probe` 通過
- GitHub Pagesは `built`
- 公開URLは HTTP 200
- 公開URLで JA/EN、desktop/mobile の4パターン確認。横スクロールなし。英語画面では英語フォーム画像、日本語画面では日本語フォーム画像を表示。
- Cloudflare WorkerのローカルAPI契約テストも通過。追加課金になるdeployやD1作成は実行していない。
- Mind the Product提出草案とNovus.ai導入チェックリストを `submission/` に追加。Novus dashboard screenshotが取れるまで提出はしない。
- `submission/reuse-strategy.md`、`submission/uipath-agenthack-devpost-draft.md`、`submission/google-rapid-agent-devpost-draft.md` を追加。共通コアは使い回すが、提出名、ユーザー、必須技術、証拠はハッカソンごとに分ける方針を固定。

## 2026-06-01 自動再生デモと使い回し境界

DDの指摘を受け、すでに公開されているページをそのまま別ハッカソンへ使い回す方針は採らない。
使い回すのは中核エンジンと証拠であり、提出ごとにユーザー、課題、必要技術、見せ方を分ける。

公開LPには2分の無音自動再生デモを追加した。

- 日本語: `assets/autoplay-demo-ja.mp4`
- 英語: `assets/autoplay-demo-en.mp4`
- 埋め込み位置: ヒーロー直下、30秒確認導線の前
- ブラウザ自動再生対策: `autoplay muted loop playsinline controls`

この動画はページ上の審査員向けプレビューとして使う。
Devpost側で外部動画URLが必須の場合は、この流れを元にYouTube等へ最終デモを載せる。

公開repoには commit `29be22f Add autoplay demo for hackathon judges` としてpush済み。
GitHub Pages buildは最新commitで `built`。公開URLと動画ファイルはHTTP 200確認済み。

## 2026-06-01 Novus/Pendo snippet install

Mind the Product向けに、既存のNovus/Pendoアカウントの公開Web installをFormPilot Vaultへ導入した。

- `index.html` と `site/index.html` にPendo/Novus frontend snippetを追加
- FormPilot用のvisitor/account識別に分離
- `pricing.js` と `site/pricing.js` に安全なイベント名を追加
  - `switch_language`
  - `view_proof`
  - `view_pricing`
  - `click_start_plan`
- `scripts/install_pendo_snippet.mjs` と `scripts/verify_novus_installed.py` を追加
- Dashboard screenshotは `submission/evidence/novus-dashboard.png` に保存済み。
- 公開URL上でPendo/Novus scriptとdata requestが発火することをPlaywrightで確認済み。
- `npm run novus:verify` は `formpilot_novus_live_proof_ok`。

## 2026-06-01 Comet導入と拡張UI確認

DDの「拡張機能ボタンからUIを出し、そのUIで今の入力フォームを解析し、登録済み情報と一致した項目だけ埋める」という指定に合わせて、FormPilot VaultをCometへローカル導入した。

- Comet導入元: `extension/`
- Comet extension ID: `fmkfadfdehcffceokoehokjmhhgppcag`
- Comet上の状態: `enabled=true`, version `0.1.0`
- Chrome Web Store公開URLは未公開状態のため、現時点のComet導入はunpacked local extension
- popupを、拡張機能ボタンから出る小さい操作UIへ変更した。通常表示は「このフォームを確認」→「合う項目を入力」に絞り、登録情報/プランは折りたたみへ移した
- 文言を「登録フォームの入力を減らす」「登録情報」「合う項目を入力」に統一した
- Comet popup direct loadで新UI文言を確認済み
- `npm run test:i18n` 通過
- `npm run test:schema` 通過
- `npm run test:extension` 通過。12項目解析、12項目入力を確認
- `npm run package:extension` 通過。`dist/ai-form-autofill-0.1.0.zip` は `77204 bytes`
- 証跡: `site/assets/real-extension-popup-loaded.png`, `site/assets/real-extension-filled-form.png`

## 2026-06-01 Chrome Web Store 小さいUI版再提出

DDの「何かのサービスに登録するとき、また名前の入力か、となる入力手間を減らす専用拡張機能」という意図に合わせて、CWS提出物も小さいpopup UI版へ差し替えた。

- 旧審査待ちをキャンセルしてドラフトへ戻した
- `dist/ai-form-autofill-0.1.0.zip` `69774 bytes` をPackage画面へ再upload
- manifest英語説明文はChrome Web Store上限132文字以内の120文字へ短縮
- Store Listingの短い説明/詳細説明を、平易な言葉へ変更
- Test instructionsを新UI文言へ変更
- 最終確認で `ステータス: 審査待ち`
- `npm run check:launch` はブロッカー0
- `npm run release:check` はブロッカー0

## 2026-06-01 登録フォームUIと対応値表示

DDの追加指定を受け、popupの登録情報編集をJSON textareaから通常フォームへ変更した。姓/名/カナ/メール/電話/住所/会社/役職を、そのまま入力できる。

フォーム解析結果は、各カードで `フォーム側` と `入る情報` を分けて表示する。たとえばページ側の「メールアドレス」に対して、登録情報の「メール: taro@example.com」が入ることが分かる形にした。

フォーム入力欄がないページでは、`フォームが見つかりません。` と表示し、入力ボタンは有効化しない。

確認結果:

- Comet unpacked extensionへ再読み込み済み
- `npm run test:i18n` 通過
- `npm run test:schema` 通過
- `npm run test:extension` 通過。13項目解析、13項目入力
- `npm run release:check` 通過
- `npm run check:launch` 通過。Dashboardは `審査待ち`
- Chrome Web Storeへ `77204 bytes` ZIPを再uploadし、審査へ再送信済み

## 2026-06-01 1対1追加情報版

DDの追加指定を受け、固定の姓/名/住所/会社だけでなく、任意の「項目名」と「値」を1対1で追加できるUIへ拡張した。登録画面の `追加情報` で、会員ID、紹介コード、希望店舗、SNS IDなどを自由に増やせる。

保存形式はユーザーにはJSONを見せず、内部では `custom.<key>` としてVaultへ保存する。フォーム側のラベル、placeholder、name、id、周辺テキストと、追加情報の項目名を照合し、合えば通常項目と同じ入力計画に乗せる。

確認結果:

- `npm run test:schema` 通過。`会員ID` / `希望店舗` の追加情報マッチを確認
- `npm run test:i18n` 通過。21 locale / 94キーで欠落なし
- `npm run test:playwright` 通過。13項目解析、13項目入力
- `npm run test:extension` 通過。13項目解析、13項目入力、`会員ID` 入力確認
- `npm run package:extension` 通過。`dist/ai-form-autofill-0.1.0.zip` は `80982 bytes`
- `npm run release:check` 通過。ブロッカー0
- `npm run check:launch` 通過。Dashboardは `審査待ち`
- 2026-06-01 17:28 JSTにChrome Web Storeへ `80982 bytes` ZIPを再uploadし、審査へ再送信済み

## 2026-06-01 未登録項目の台帳追加

DDの追加指定を受け、フォーム確認で見つけた未登録項目を、その場で登録台帳に追加できるUIを入れた。手入力扱いになった項目カードに `見つけた項目を台帳に追加` を表示し、登録名、入力する値、呼び名を編集して `この項目を登録` できる。

登録すると `custom.<key>` としてVaultへ保存し、そのフォーム項目との対応も学習する。つまり、先に台帳へ登録していなくても、フォーム側で新しい入力欄を見つけたタイミングで台帳を増やし、次回以降の自動入力へつなげられる。

確認結果:

- `npm run test:schema` 通過。登録台帳の呼び名マッチを確認
- `npm run test:i18n` 通過。21 locale / 99キーで欠落なし
- `npm run test:playwright` 通過。14項目解析、14項目入力
- `npm run test:extension` 通過。14項目解析、14項目入力
- `npm run package:extension` 通過。`dist/ai-form-autofill-0.1.0.zip` は `84363 bytes`
- `npm run release:check` 通過。ブロッカー0
- `npm run check:launch` 通過。Dashboardは `審査待ち`
- 2026-06-01 18:00 JSTにChrome Web Storeへ `84363 bytes` ZIPを再uploadし、審査へ再送信済み

## 2026-06-01 登録台帳UIの見つけやすさ改善

DDの追加指定を受け、登録台帳がどこにあるか分かりにくい問題を直した。設定ボタンの表示を `登録情報 / 登録台帳 / プラン` にし、台帳欄の下へ「1行ずつ追加でき、呼び名でフォーム表記の違いにも合わせる」説明を追加した。

フォーム確認で見つけた未登録項目を台帳へ追加した時は、設定画面を開いて保存された行へ移動し、追加行を短時間ハイライトする。これで「AIが見つけた新しい項目を台帳へ増やす」流れが目で追える。

2026-06-01 20:38 JSTにUIUX優先で追加磨きを行った。第一画面に `登録 / 確認 / 入力` の3ステップを常時表示し、入力ボタンは確認前に `確認後に入力` と表示する。設定内は `登録情報 / 登録台帳 / プラン` のタブに分け、狭いpopup内で台帳とプランを探しやすくした。Chrome Web Store用の `store-assets/screenshot-popup-1280x800.png` も登録台帳UIを見せる画像へ更新済み。

2026-06-02 05:19 JSTに、3ステップ表示がテキスト選択できてしまう問題を修正した。`登録 / 確認 / 入力` は表示専用として `user-select: none` / `pointer-events: none` にした。確認結果の `入力OK` は意味が曖昧だったため、`自動入力` へ変更した。

登録台帳は、単なる追加情報リストではなく辞書登録として強化した。台帳検索、行ごとの種類、`会員番号` / `シート用語` / `案件ID` のクイック追加ボタンを追加した。スプレッドシートの列名、管理項目、社内コード、案件IDなど、標準プロフィール項目では拾えない固有語を1対1で育てる前提にした。

確認結果:

- `npm run test:schema` 通過。辞書カテゴリつきのスプレッドシート固有項目マッチを確認
- `npm run test:i18n` 通過。21 locale / 132キーで欠落なし
- `npm run test:extension` 通過。14項目解析、14項目入力、3ステップ表示の選択不可、台帳検索、辞書追加ボタン、`登録台帳` タブ、台帳説明文を確認
- `npm run test` 通過。schema / i18n / Vault暗号化 / API / Worker / Checkout site / Playwright smokeを確認
- `npm run assets:store` 通過。登録台帳UIのCWS用スクリーンショットを更新
- `npm run package:extension` 通過。`dist/ai-form-autofill-0.1.0.zip` は `97171 bytes`
- `npm run release:check` 通過。ブロッカー0
- `npm run check:launch -- --require-published` 通過。Chrome Web Store公開URLは `published: true`、ブロッカー0
- この時点のUIUX版 `97171 bytes` はCWS更新候補として未uploadだった。現在の最新は後続の `105168 bytes` / `0.1.1` 版。

## 2026-06-02 住所自動検索と登録フォーム初期値改善

DDの追加指定を受け、住所欄はZipCloudの郵便番号検索APIで、郵便番号から都道府県・市区町村・町名を自動入力する初期設定にした。郵便番号欄に7桁が入ると検索し、結果があれば `150-0001` のように整形して住所欄へ反映する。フォームに値を入れる前の登録情報は空にし、`山田` などの例は値ではなくプレースホルダーで表示する。

電話番号は `090 / 1234 / 5678` の3欄に分けた。保存ボタンを押した後は、下に `登録しました` と出して完了が分かるようにした。

確認結果:

- `npm run test:schema` 通過。ZipCloud返却形式の正規化テストを追加
- `npm run test:i18n` 通過。21 locale / 152キーで欠落なし
- `npm run test:extension` 通過。空の初期値、プレースホルダー、郵便番号住所検索、保存完了表示、電話3分割、台帳UIを実ブラウザで確認
- `npm run test` 通過。schema / i18n / Vault暗号化 / API / Worker / Checkout site / Playwright smokeを確認
- `npm run assets:store` 通過
- `npm run package:extension` 通過。`dist/ai-form-autofill-0.1.0.zip` は `105140 bytes`
- `npm run release:check` 通過。ブロッカー0、21 locale / 152キー
- `npm run check:launch -- --require-published` 通過。Chrome Web Store公開URLは `published: true`、ブロッカー0
- この後、Free月20回へ戻した `0.1.1` / `105168 bytes` をCWS更新審査へ送信済み

## 2026-06-02 Free月20回・CWS 0.1.1 更新審査

DDの「Freeは月20回で課金させたい」という方針を、コード、API、LP、Terms、Chrome Store文面、検証スクリプトへ戻した。公開済みCWS版との差分を明確にするため、manifest/package versionは `0.1.1` へ上げた。

確認結果:

- `npm test` 通過。schema / i18n / Vault暗号化 / API / Worker / Checkout site / Playwright smokeを確認
- `npm run assets:store` 通過。Store用スクリーンショットもFree月20回表記へ更新
- `npm run package:extension` 通過。`dist/ai-form-autofill-0.1.1.zip` は `105168 bytes`
- `npm run release:check` 通過。ブロッカー0、21 locale / 152キー
- `npm run deploy:vercel` 通過。2026-06-02 09:47 JST時点のdeployment idは `dpl_8pHFLoNoSJc7YYcAHsDRmcwZrUuF`。2026-06-02 10:07 JSTにSearch Console確認ファイル追加で `dpl_2XQexJK5PBV6c7W3XPq48hqsuVSF` へ更新
- `npm run deploy:worker` 通過。Cloudflare Worker version id `a1c1eca3-084f-4a44-a5e1-1264227ab73e`
- `npm run check:production` 通過。Vercel本番Free entitlementは月20回、Plus/Pro/Teamは `cs_live_` Checkout Sessionを返す
- `npm run check:cloudflare:live` 通過。Cloudflare本番schema live、Stripe bridge、Free月20回を確認
- `npm run check:seo -- --live` 通過
- `npm run check:launch -- --require-published` 通過。CWS公開URLはpublished
- CWS Dashboardへ `0.1.1` ZIPをアップロードし、更新審査へ送信済み。Dashboard読み戻しでは `ステータス: 審査待ち`、ドラフト `0.1.1`、公開済み `0.1.0`

## 2026-06-02 11:48 JST Free月20回の再固定・本番/公開ミラー再反映

DDの最新指定「月20回だよ、フリー」を正として、Free制限を再確認し、本体、Vercel本番、Cloudflare Worker本番、公開GitHub Pagesミラーを月20回へ揃えた。`月5回` / `5 fills` / `monthly_fills: 5` の残存検索は対象範囲で0件。

確認結果:

- `npm test` 通過。schema / i18n / Vault暗号化 / API / Worker / Checkout site / Playwright smokeを確認
- `npm run assets:store` 通過
- `npm run package:extension` 通過。ローカル最新ZIP `dist/ai-form-autofill-0.1.1.zip` は `105172 bytes`
- `npm run release:check` 通過。ブロッカー0、21 locale / 152キー
- `npm run deploy:vercel` 通過。Vercel deploymentは `dpl_2Sz1QfJmP7DYE44VU2zguRTvPYob`、production aliasは `https://formpilot-vault-api.vercel.app`
- `npm run deploy:worker` 通過。Cloudflare Worker version idは `dfffe4e1-856b-4768-8125-97aaea970e0b`
- `scripts/check-cloudflare-live.mjs` はFree entitlementの `monthly_fills === 20` を必須条件に強化した
- `npm run check:seo -- --live`、`npm run check:production`、`npm run check:cloudflare:live`、`npm run check:launch -- --require-published` はブロッカー0で通過
- `npm run check:production` はVercel本番Free entitlement月20回、Plus/Pro/Teamの `cs_live_` Checkout Session作成を確認
- `npm run check:cloudflare:live` はCloudflare schema live、Stripe checkout bridge、Free entitlement月20回を確認
- 公開repo `daideguchi/formpilot-vault` へcommit `6c7ad36 Set Free plan to 20 monthly fills` をpush
- GitHub Pages pages-build-deployment run `26795204977` は成功。Node 20 deprecation annotationのみ
- `npm run novus:public` 通過。`/`、`/form-input.html`、`/form-autofill.html`、`/signup-autofill.html`、`/contact-form-autofill.html`、`/success.html?license_key=afa_public_probe_success`、`/demo.html` でPendo request、`pendo.initialize`、横スクロールなしを確認
- Vercel本番とGitHub Pages公開ミラーの主要SEOページはHTTP 200、`月20回` / `20 fills` あり、`月5回` / `5 fills` なしを実測

Chrome Web Storeは引き続き公開済みで、Dashboard読み戻しは `ステータス: 審査待ち`、ドラフト `0.1.1`、公開済み `0.1.0`。今回11:48 JSTのローカル最新ZIP `105172 bytes` は再生成済み。11:52 JSTに実ブラウザでDashboard Package画面を確認したところ、`新しいパッケージをアップロード` ボタンはdisabledで、審査待ち中の差し替えuploadは不可だった。審査通過後、必要なら `0.1.2` として再提出する。

2026-06-02 12:06 JST時点のSearch Console URL検査では、`https://formpilot-vault-api.vercel.app/form-input` はまだ `URL が Google に登録されていません`、理由は `URL が Google に認識されていません`。`インデックス登録をリクエスト` は表示されているが、画面下部に `割り当て量を超えています`、`1日の割り当て量を超えたため、リクエストを処理できませんでした。明日、もう一度お試しください。` が出ている。外部HTTPではVercel本番とsitemapは200確認済みなので、残作業は翌日以降の再リクエスト。

## 次の一歩

1. Mind the Product: Devpostが外部動画URLを要求する場合、埋め込み済み2分デモを元に提出用動画を作る
2. Chrome Web Storeは公開済み。`0.1.1` は更新審査待ちなので、審査通過後に公開版が `0.1.1` になったことを読み戻す
3. 0円CheckoutでPlus activeは確認済み。実売上の入金確認は、無料プロモーションなしの有料決済またはStripe Dashboard上の売上確認で行う
4. UiPath AgentHack: `Form Intake Case Room` のUiPath証拠を作る
5. Google Rapid Agent: `FormOps Agent` のGemini / Agent Builder / Partner MCP証拠が作れるか判定する
6. 日本語の公開/許可済みデモフォームを増やして認識率を測る
7. mapping cacheの2回目成功率を測る
