# Real Browser Verification

作成日: 2026-06-01
状態: `passed_local_real_browser`

## 目的

実際にChrome/Chromiumへ拡張を読み込み、拡張API経由でフォームDOM収集と入力が動くかを確認する。

## 実行コマンド

```bash
npm run test:extension
```

## 検証内容

- Chromium persistent contextを起動
- 一時拡張ディレクトリを作成し、`--load-extension` で読み込み
- local HTTPでサンプル登録フォームを表示
- extension service workerから `chrome.scripting.executeScript` でcontent scriptを投入
- `AFA_COLLECT_FIELDS` でDOMを収集
- ルール/プロフィールDBから入力プランを作成
- `AFA_FILL_FIELDS` で実DOMに入力
- extension popupページを開き、License key確認UIを操作
- Plus entitlementの表示を確認

## 結果

### Local sample form

```json
{
  "fields_scanned": 12,
  "fields_filled": 12,
  "usage_status": "PLUS plan / 0 fills this month"
}
```

確認できた入力:

- 姓: 山田
- 名: 太郎
- セイ: ヤマダ
- メイ: タロウ
- メール: taro@example.com
- 電話番号: 090-1234-5678
- 郵便番号: 150-0001
- 都道府県: 東京都
- 住所: 東京都渋谷区神宮前1-2-3 サンプルマンション101
- 会社名: 株式会社サンプル
- 役職: 代表
- パスワード: 生成値

## 証跡

- `site/assets/real-extension-popup-loaded.png`
- `site/assets/real-extension-popup-license.png`
- `site/assets/real-extension-filled-form.png`

### Public demo forms

実公開ページでも、送信せずにDOM収集と入力反映だけを確認した。

```json
[
  {
    "id": "httpbin_forms_post",
    "fields_scanned": 12,
    "fields_ready": 4,
    "fields_filled": 4,
    "asks": 8
  },
  {
    "id": "selenium_web_form",
    "fields_scanned": 14,
    "fields_ready": 1,
    "fields_filled": 1,
    "asks": 13
  }
]
```

証跡:

- `site/assets/public-site-real-browser-probe.json`
- `site/assets/public-probe-httpbin_forms_post.png`
- `site/assets/public-probe-selenium_web_form.png`

## 注意

実機E2Eでは、テスト用の一時拡張ディレクトリにだけlocal fixtureの `host_permissions` を追加する。本体の `extension/manifest.json` は `activeTab + scripting + storage` の最小権限を維持する。

## 次

1. Chrome手動読み込みでローカル実サイト検証
2. 実サイト5件で `fields_scanned / ready / ask / filled` を記録
3. mapping cacheの再利用率を見る
4. ストア提出用スクリーンショットを実機E2Eから生成
