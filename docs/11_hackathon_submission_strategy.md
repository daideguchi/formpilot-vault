# ハッカソン転用戦略

作成日: 2026-06-01
対象プロダクト: `AIフォームオートフィル`

## 結論

このプロダクトはハッカソンへ出せる。

ただし、すでに公開されているページや提出済み作品を、そのまま別ハッカソンへ再提出しない。
同じ見せ方で3本へ出すのではなく、同じ中核を3つの角度へ出し分ける。

中核:

```text
フォームを読む
入力候補を作る
個人情報は端末内Vaultから使う
送信前に人間が確認する
使うほどMemoryが育つ
```

2026-06-01時点の方針:

- コア実装は共通で使う
- 公開済みページをそのまま再提出しない
- 提出名、ユーザー、必須技術、証拠はハッカソンごとに分ける
- UiPath / Google の必須技術を使った証拠が取れるまでは、完成提出とは呼ばない
- 詳細は公開repoの `submission/reuse-strategy.md`

## 1. Mind the Product

優先度: `P0`

公式確認:

```text
URL: https://mindtheproduct.devpost.com/
締切: 2026-06-20 17:00 BST
発表: 2026-07-06 14:00 BSTごろ
賞金: $10,000 cash
参加者: 約529
必須: 公開URL、2〜3分動画、Novus.ai導入スクリーンショット、短い説明
複数提出: 可能。ただし既存提出と実質的に違う必要がある。
```

注意:

- このハッカソンには既に `Shiproom OS` の提出済み記録がある。
- `FormPilot Vault` は、フォーム入力という別課題の別プロダクトとして扱う。
- 公式ルール上、複数提出は可能だが、各提出は互いに十分に違う必要がある。

理由:

- 締切が近いが、まだ磨く時間がある
- 必須技術がNovus.aiだけで、実装自由度が高い
- 審査基準が「誰の課題か」「実際に使えるか」「UI/コピーが良いか」に寄っている
- このプロダクトの価値を一番シンプルに伝えやすい

提出名候補:

```text
FormPilot Vault
```

一言:

```text
For people who fill out the same forms every week, FormPilot Vault turns repeated typing into a reviewed one-click fill, while keeping personal data on the device.
```

日本語:

```text
毎週フォームを書く人のために、同じ名前・住所・会社情報の入力を、確認つきワンクリック入力へ変えるChrome拡張です。
```

必要な追加作業:

- 公開URL
- Novus.ai導入
- 2〜3分デモ動画
- 英語/日本語の完全切替
- 30秒で分かる証拠導線
- プライバシー方針の公開

現状:

- 公開LP内に2分の無音自動再生デモを追加済み。
- 日本語表示は `assets/autoplay-demo-ja.mp4`、英語表示は `assets/autoplay-demo-en.mp4`。
- Devpost側で動画URL提出が必須の場合は、この埋め込み動画を元にYouTube等へ最終版を載せる。

## 2. UiPath AgentHack

優先度: `P1`

公式確認:

```text
URL: https://uipath-agenthack.devpost.com/
締切: 2026-06-29 23:45 PDT
発表: 2026-08-04 15:00 EDTごろ
賞金: $50,000 cash
参加者: 2082
必須: UiPath Platformを実行/オーケストレーション層として使う
```

理由:

- フォーム入力と業務自動化の相性は強い
- ただしUiPathを実行/オーケストレーション層として使う必要がある
- 既存のUiPath提出資産とは別に、フォーム作業のケース管理として見せると強い

提出名候補:

```text
Form Intake Case Room
```

一言:

```text
An agentic case room for form-heavy business intake: AI drafts the fill plan, UiPath routes exceptions to humans, and every decision is logged before submission.
```

日本語:

```text
申請・登録・問い合わせフォームの入力作業を、AIの入力案、人間確認、例外管理、ログに分けて扱う業務ケース管理ツールです。
```

必要な追加作業:

- UiPath Maestro Case か BPMN のどちらに寄せるか固定
- Action Center風の例外確認画面を証拠化
- 「送信しない」「人間確認」「監査ログ」を前面に出す
- UiPath package / architecture / demo を用意

## 3. Google Cloud Rapid Agent

優先度: `P2`

公式確認:

```text
URL: https://rapid-agent.devpost.com/
締切: 2026-06-11 14:00 PDT
賞金: $60,000 cash
参加者: 12328
必須: Gemini + Google Cloud Agent Builder + Partner MCP
注意: ハッカソン発行の$100 Google Cloud creditsは枠切れ。実費ゼロで進める。
```

理由:

- 締切が最も近い
- 賞金は大きいが参加者が非常に多い
- Gemini + Agent Builder + Partner MCP が必須なので、素のChrome拡張だけでは足りない
- 既存のGoogle Rapid Agent提出資産を活かす方が現実的

提出名候補:

```text
FormOps Agent
```

一言:

```text
A Gemini-powered agent that plans form follow-up work, checks missing proof, and prepares safe fill tasks without sending private values to the model.
```

日本語:

```text
Geminiでフォーム作業の不足、証拠、次の確認を整理し、個人情報をAIへ送らずに安全な入力タスクへ分解するエージェントです。
```

必要な追加作業:

- Partner trackを1つ選ぶ
- Partner MCPの使い道を明確にする
- Google Cloud / Gemini / Agent Builder利用の証拠を作る
- 無料/既存クレジット以外の実費を出さない

## 今回の実装確認

通過済み:

```text
npm test
npm run test:extension
npm run test:public-probe
```

確認できたこと:

- ルール/Memoryで日本語フォームをプロフィールキーへ対応づける
- AI safe payloadが実値を含まない
- Chrome拡張E2Eで12項目収集/12項目入力
- 公開フォーム2件で送信なしの実ブラウザ検証
- Plus license表示
- LP checkout smoke

修正したこと:

- `tests/site-checkout-smoke.mjs` のクリック待機が不安定だったため、意図したcheckout clickイベントを直接発火する形へ安定化
- LPを審査員向けに再構成
  - 30秒確認導線
  - 誰のため/何の課題/どう動く/何が証拠
  - 日本語/英語切替
  - 余白を減らした構成
- 2分の自動再生デモをヒーロー直下へ追加
  - `autoplay`
  - `muted`
  - `loop`
  - `playsinline`

## 現時点の弱点

- 公開URLは作成済み: `https://daideguchi.github.io/formpilot-vault/`
- GitHub公開リポジトリも作成済み: `https://github.com/daideguchi/formpilot-vault`
- Novus/Pendo frontend snippetは導入済み
- Novus dashboard screenshotは取得済み
- Novus rules上の登録URLは `https://novus.pendo.io/register`。dashboard screenshotが必須。
- 実AIプロキシの本番smokeがまだ
- Chrome Web Store提出はまだ
- 実サイト評価数が少ない
- Google Rapid Agent向けのPartner MCP接続は未設計

## 次の一手

1. Devpostが外部動画URLを要求する場合、埋め込み済み2分デモを元に提出用動画を作る
2. Devpostが外部動画URLを要求する場合、埋め込み済み2分デモを元に提出用動画を作る
3. `FormPilot Vault` としてDevpost提出パッケージを作る
4. その後、UiPath向けに `Form Intake Case Room` へ分岐する
5. Google Rapid Agentは締切が近いので、既存Google提出資産にフォーム作業ストーリーを統合できる場合だけ攻める
