# Profile Vault / RAG Core Concept

作成日: 2026-06-01
状態: `core_concept`
実装: `extension/src/profile-memory.js`, `extension/src/vault-crypto.js`

## 結論

この事業の一番の価値は、フォームを入力する人の個人情報・会社情報・入力の癖・サイト別の正解を、安全にためて、次のフォーム入力で正しく使えることです。

つまり、ただの自動入力ボタンではありません。

`個人情報Vault + 入力判断用RAG/記憶スペース + フォーム理解AI` がコアです。

## なぜ必要か

フォーム入力で面倒なのは、値そのものだけではありません。

- どの住所を使うか
- ハイフンあり/なしの電話番号を選ぶか
- 会社名を正式名称にするか略称にするか
- カナを全角にするか
- 建物名を分けるか住所に含めるか
- このサイトでは前回どの入力が通ったか
- この項目は毎回ユーザーに確認すべきか

これらは、単純なkey-value保存だけでは弱いです。

ユーザーごとの情報、表記ゆれ、サイト別の学習、過去の修正を、次の判断に使える形で持つ必要があります。

## 2層に分ける

### 1. Personal Vault

実値を保存する場所です。

例:

- 氏名
- 住所
- 電話番号
- メール
- 会社名
- 部署
- 役職
- 複数住所
- 複数プロフィール
- 入力用パスワード方針

原則:

- 端末内保存を基本にする
- 端末内保存でもプロフィール実値は暗号化して保存する
- 将来クラウド同期する場合も暗号化を前提にする
- AIプロバイダへ実値を送らない
- Chrome拡張に秘密APIキーを入れない

### 2. Profile RAG / Memory Space

AIやルールが「どの値を使うべきか」を判断するための記憶スペースです。

ここには、実値そのものではなく、判断材料をためます。

例:

- `person.address.home` は個人利用フォームで使う
- `company.address.office` は資料請求やB2B問い合わせで使う
- `example.com/signup` では郵便番号はハイフンあり
- `姓カナ` は `person.name.last_kana` に対応
- `ご担当者名` は会社プロフィールではなく個人名を入れる
- `建物名・号室` があるサイトでは住所からline2を分離する
- ユーザーが前回 `電話番号ハイフンあり` に修正した

## AIへ渡すもの

AIへ渡してよいもの:

- フォーム構造
- label / placeholder / name / id / autocomplete
- 選択肢
- semantic keyの候補
- サイト別マッピングの抽象ルール
- ユーザー修正から作った非実値の学習メモ

AIへ渡さないもの:

- 氏名の実値
- 住所の実値
- 電話番号
- メールアドレス
- パスワード
- Cookie
- token
- 入力済み値

## データモデル案

MVPでは `chrome.storage.local` に `vaultState` として保存します。プロフィール実値は `extension/src/vault-crypto.js` でAES-GCM暗号化した `encrypted_values` として保存し、popup実行中だけ復号して入力計画へ使います。サイト別mapping cacheやcorrection eventは実値ではなく `profile_key` とフィールド署名だけを保持します。

```json
{
  "vault_profiles": [
    {
      "profile_id": "personal_main",
      "label": "個人メイン",
      "encrypted_values": {
        "version": 1,
        "alg": "AES-GCM",
        "iv": "...",
        "ciphertext": "..."
      },
      "encryption": {
        "version": 1,
        "alg": "AES-GCM",
        "scope": "device_local"
      }
    },
    {
      "profile_id": "company_main",
      "label": "会社メイン",
      "encrypted_values": {}
    }
  ],
  "semantic_memory": [
    {
      "memory_id": "mem_001",
      "scope": "site",
      "origin": "https://example.com",
      "pattern": "postal code field prefers hyphen",
      "profile_key": "person.address.postal_code_hyphen",
      "confidence": 0.96,
      "source": "user_correction"
    }
  ],
  "mapping_cache": [
    {
      "origin": "https://example.com",
      "path_pattern": "/signup",
      "field_signature": "name:last_name|label:姓",
      "profile_key": "person.name.last",
      "confidence": 0.99,
      "last_success_at": "2026-06-01T00:00:00+09:00"
    }
  ]
}
```

実装済みの最小構成:

- `vault_profiles`: 暗号化された実値を持つローカルProfile Vault
- `semantic_memory`: 非実値の判断メモ置き場
- `mapping_cache`: origin/path/field_signature/profile_keyのサイト別記憶
- `correction_events`: ユーザー修正から学習するイベントログ
- `buildMemoryContext`: 現在のフォームに効く記憶だけを取り出すlocal retrieval
- `learnMappingsFromPlan`: 入力成功後に実値なしでマッピングを保存
- popupの `Learn` UI: 不確定項目をユーザーがプロフィールキーへ紐づけて保存
- `extension/src/ai-payload.js`: AIへ渡すフォーム構造/Memory contextから実値とselectorを除外
- `extension/src/vault-crypto.js`: プロフィール実値をAES-GCMで暗号化保存し、旧平文Vaultを初回起動時に自動移行

## MVPでの実装順

1. 端末内の構造化Profile Vault: 実装済み
2. Profile Vault暗号化保存: 実装済み
3. サイト別mapping cache: 実装済み
4. ユーザー修正からの学習メモ: 最小UIまで実装済み
5. semantic key辞書
6. 必要になった段階で小さなlocal RAG検索: MVP retrievalは実装済み
7. Team版で共有テンプレート/RAG

## 収益化への接続

この層が課金価値になります。

- Free: プロフィール1つ、月5回、ローカル基本入力
- Plus: 複数プロフィール、無制限、サイト別学習
- Pro: 会社プロフィール、住所複数、履歴、長文補助
- Team: 共有Vault、共有mapping、監査ログ、承認

つまり、課金させる理由は「AIがすごい」ではなく、`自分用に育った入力記憶があるから、戻れなくなる` ことです。
