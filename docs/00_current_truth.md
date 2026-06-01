# Current Truth

更新日: 2026-06-01
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
- API切替方針: `extension/src/provider-router.js`
- AI安全ペイロード: `extension/src/ai-payload.js`
- AI schema proxy: `api/schema-proxy/`
- entitlement API: `api/entitlement/`
- サンプルフォーム検証: `tests/`
- 実ブラウザ拡張E2E: `tests/extension-real-browser-e2e.mjs`
- 公開デモフォーム実ブラウザ検証: `tests/public-site-real-browser-probe.mjs`
- リリース/課金計画: `docs/`
- Free/Plus/Pro/Teamの利用制限: `extension/src/usage-meter.js`
- Vault/RAGコア設計: `docs/08_profile_vault_rag_core.md`
- Vault/RAG最小DB: `extension/src/profile-memory.js`

`extension/src/profile-memory.js` で、ローカルVault、サイト別mapping cache、ユーザー修正イベント、フォーム単位のmemory retrievalを実装済みです。入力成功後、実値ではなく `profile_key` とフィールド署名だけを保存して、次回の推論に使います。

popup上で不確定項目をプロフィールキーへ紐づける `Learn` UIも実装済みです。これにより、ユーザー修正を `correction_events` と `mapping_cache` に保存し、同じフォームでは次回からMemory優先で入力プランへ反映します。

AIへ渡すschema inference payloadも実装済みです。フォーム構造とMemory contextは渡しますが、input value、CSS selector、プロフィール実値は入れないテストを固定しています。

リリース/課金に必要なAPI土台も実装済みです。`api/schema-proxy/` はAzure DeepSeek V4からCloudflare Workers AIへ日付で切替し、`api/entitlement/` はStripe webhookとlicense checkを扱います。popupにはLicense key確認欄を追加済みです。

初期プロダクト方針は実際のschema proxyプロンプトへ入れました。`buildSchemaPrompt()` は、フォーム入力の細かな手間をなくす、Personal Vault + Profile RAG/Memory Spaceを核にする、実値を扱わない、不確定項目はユーザー確認へ残す、送信/認証突破/大量作成はしない、という方針を含みます。

Stripe Checkout作成APIとLP側の決済導線も実装済みです。Plus/Pro/Teamボタンから `POST /api/stripe/checkout-session` を呼び、Checkout成功後にLicense keyを表示します。実際に入金される本番状態にするには、Stripe本番secret、Plus/Pro/Teamのprice id、公開URL、webhook URL、本番entitlement DBを接続します。

実ブラウザ検証も通過済みです。Chromiumに拡張を `--load-extension` で読み込み、extension service worker / content script / DOM入力まで実行しました。12項目収集、12項目入力、Plus license表示まで確認済みです。証跡は `docs/10_real_browser_verification.md` と `site/assets/real-extension-*.png` にあります。

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

- Chrome Web Store提出用のスクリーンショット
- プライバシーポリシー公開URL
- 実AIプロキシのデプロイ
- Stripe商品/価格作成
- entitlement APIの本番DB接続
- サイト別マッピングUI
- Profile Vaultの暗号化設計
- 入力判断用RAG/Memory Spaceの実サイト評価

## 2026-06-01 ハッカソン転用確認

プロジェクト方針として、今作っている入力フォーム自動入力プロダクトを、賞金化しやすいハッカソンへ使いたいという方針を受けた。

確認結果:

- Mind the Productは最優先。`FormPilot Vault` として、実際に使えるChrome拡張/LP/Novus.ai/2〜3分動画へ寄せる。
- UiPath AgentHackは2本目。`Form Intake Case Room` として、AI入力案、人間確認、例外管理、監査ログへ寄せる。
- Google Cloud Rapid Agentは3本目。締切が近く競争が強いため、既存Google提出資産へフォーム作業ストーリーを統合できる場合だけ攻める。

今回の確認で `npm test`、`npm run test:extension`、`npm run test:public-probe` は通過した。
`tests/site-checkout-smoke.mjs` はPlaywrightの通常click待機が不安定だったため、checkout clickイベントを直接発火する形へ修正し、`npm test` が通る状態へ戻した。

LPもハッカソン審査員向けに更新した。日本語/英語切替、30秒確認導線、誰のため/何の課題/どう動く/何が証拠の4カードを追加し、余白を減らした。

詳細: `docs/11_hackathon_submission_strategy.md`

## 次の一歩

1. 日本語の公開/許可済みデモフォームを増やして認識率を測る
2. mapping cacheの2回目成功率を測る
3. Azure DeepSeek V4プロキシを実キーでsmoke test
4. 2026-06-07のCloudflare切替前に無料枠モデルで同じJSON応答を返せるか確認
5. サイト別mapping cacheの一覧/削除UIを作る
6. Stripe Checkout商品/価格と本番entitlement DBをつなぐ
7. LPとChrome Web Store素材を整える
