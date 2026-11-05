# C組仮想空間

HTML + CSS + JS + three.js だけで動く、VRChat 風の仮想空間アプリ（PC / スマホ対応、VR 非対応）。
サーバーは持たず、GitHub Pages に置くだけで動きます。メンバー同士の同期・チャット・ボイスチャットは WebRTC（PeerJS の公開ブローカー）で直接つながります。

## すぐ使う
1. `pip install cryptography`
2. `python tools/build.py` → ルートの `index.html` が生成され、**各ユーザーのパスワードが表示されます**（初回のみ。`tools/secrets.local.json` にも保存。**コミット禁止**・`.gitignore` 済み）
3. リポジトリを GitHub に push → Settings → Pages → Source を「GitHub Actions」に（`.github/workflows/pages.yml` が自動デプロイ）
4. 公開 URL を開く。**HTTPS 必須**（暗号化の解錠とマイクが HTTPS を要求します）

## 運用
| やりたいこと | 方法 |
|---|---|
| アカウント追加 | `tools/accounts.json` に ID を**末尾に**追加 → `python tools/build.py`（順番は個人部屋の持ち主に使うので並べ替えない） |
| パスワード再発行 | `python tools/build.py --reset Hulria` |
| イベント掲示の編集 | `config.json` の `events` → build |
| 動作確認 | `cd tests && npm i three@0.128.0 jsdom@22 && node smoke.js <パスワード>`（引数のIDは `smoke.js` 内の Hulria） |

## 操作
- 移動: WASD / 矢印（Shiftで走る）、スマホは左下スティック。視点: ドラッグ、ズーム: ホイール / ピンチ
- `E` またはボタンで操作、`V` で 3D ⇄ 2D（上空視点）切替
- ドア・エレベーター・ベンチ・掲示板・仮想端末は近づくと操作ボタンが出ます

## セキュリティの考え方（簡易対策）
- メンバー機能のコード（`member.js`）は AES-256-GCM で暗号化して HTML に埋め込み。鍵は**ユーザーごとのパスワード**（PBKDF2-SHA256 60万回）から導出した鍵でラップ。ゲストは暗号化部分を読めません
- 同期ルーム名も暗号鍵由来なので、メンバー以外は同じルームに入れません
- ただし HTML は誰でも取得できるため、**オフラインで総当たりされ得る**点は変わりません。パスワードは 16 文字（約 79 bit）にしてあります。流出したら `--reset` して再デプロイ
- ドアの施錠・声の遮断は各クライアントの申告ベース（サーバーが無いため）。身内利用前提です

詳細は [docs/REFERENCE.md](docs/REFERENCE.md)、今後の計画は [docs/ROADMAP.md](docs/ROADMAP.md)。
