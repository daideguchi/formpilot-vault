# API Provider Policy

作成日: 2026-06-01
決定者: DD

## 決定

- 2026-06-06 までは `Azure DeepSeek V4`
- 2026-06-07 以降は `Cloudflare Workers AI` の無料枠モデル

## 実装上のルール

Chrome拡張からAzureやCloudflareを直接叩かない。

理由:

- APIキーを拡張機能に入れると漏れる
- Chrome Web Store審査でユーザーデータの説明が重くなる
- プロバイダ切替をサーバー側で吸収したい

実装:

- `api/schema-proxy/schema-proxy.js`
- `api/schema-proxy/server.mjs`
- `extension/src/ai-payload.js`

## ルーティング

```text
extension popup
  -> form structure only
  -> schema proxy
  -> provider router
      2026-06-06まで: Azure DeepSeek V4
      2026-06-07から: Cloudflare Workers AI free allocation
  -> profile key mapping only
  -> extension local formatter
  -> content script fill
```

## 実プロンプトへ入れたDD方針

`api/schema-proxy/schema-proxy.js` の `buildSchemaPrompt()` に、DDの初期思想を実際のプロンプトとして入れています。

- フォーム入力の細かな手間をなくす
- コア価値は `Personal Vault + Profile RAG/Memory Space + form understanding`
- Memoryはprofile semantic keyを選ぶために使い、個人情報の実値は扱わない
- 不確定項目はユーザー確認へ残す
- 送信、CAPTCHA、SMS認証、メール認証、大量アカウント作成は自動化しない

## Azure期間

用途:

- ルールで不明な日本語項目の意味推定
- field_id -> profile_key のJSON返却

注意:

- Azure AI Content Safetyを有効にする
- DeepSeek-V4-Proは安全性評価の注意があるため、フォーム構造分類だけに用途を絞る
- 個人情報の実値は送らない

2026-06-01確認:

- Azure CLIは `degutidai@gmail.com` でログイン済み
- 既存Azure AI Services: `degutidai-1418-resource`, `degutidai-5815-resource`
- 両方ともmodel deploymentは空
- Vercel本番にも `AZURE_DEEPSEEK_ENDPOINT` / `AZURE_DEEPSEEK_API_KEY` は未投入
- 現在は `rules_fallback` で継続稼働する

## Cloudflare期間

初期候補:

- primary: `@cf/zai-org/glm-4.7-flash`
- fallback: `@cf/qwen/qwen3-30b-a3b-fp8`

無料枠:

- Workers AIはFree/Paid Workers planで利用できる
- Free allocationは1日10,000 Neurons
- 超過時は失敗扱いにしてローカルルールへ戻す

## 応答JSON

AIは値ではなく対応関係だけ返す。

```json
{
  "field_001": {
    "semantic_key": "person.name.last",
    "confidence": 0.97,
    "reason": "label is 姓"
  }
}
```

## テスト

`npm test` で以下を固定しています。

- 2026-06-06まではAzure、2026-06-07以降はCloudflare
- unsafe payloadの `value` / `selector` を拒否
- Azure/Cloudflare風レスポンスを同じmapping形式へ正規化
- AI payloadにプロフィール実値を含めない
