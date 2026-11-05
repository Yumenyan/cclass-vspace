# ロードマップ（未実装と設計メモ）

現状: 街・建物・各階・エレベーター・ドア/ゾーン・同期・近接VC・チャット・2D/3D・アバター（画像）・個人別パスワード。
各部屋は案内ポップアップのみで、中身は `W.roomHandlers[kind]` に差し込む。

| 機能 | 方針 |
|---|---|
| PC室 | ファイル転送: PeerJS の DataConnection で Blob を分割送信。GitHub閲覧: `api.github.com/repos/{owner}/{repo}/contents/` を fetch（`config.json` の `github`）、DL は `download_url` |
| 多目的室A/B | `getDisplayMedia` → 同ゾーンの相手へ `peer.call(pid,stream,{metadata:{kind:'screen'}})` → 受信側は `THREE.VideoTexture` を部屋内の仮想モニターに貼る。専用チャットは `c` に `room` フィールドを足してゾーンで絞る |
| 暴室 | 壊せるオブジェクト/サンドバッグ等のミニ施設（クリックで破壊・演出）。スコアは同期不要 |
| ゲーム部屋A〜E | `roomHandlers.game` で部屋名ごとにゲームを割当。複数人は `c` と同様に専用メッセージ（`g`）で同期（じゃんけん・〇×・反応速度から） |
| 図書館 | `config.json` に `apps:[{name,url}]` を追加し、リンク一覧を `window.open(url,'_blank')` |
| カウント部屋 | スプレッドシートを「ウェブに公開」→ gviz CSV/JSON を fetch（`sheetId`）。失敗時は `worlds`/`data` の静的JSONにフォールバック |
| クリエイティブ部屋 / 奥の出口 | 空間を JSON（`{objects:[{type,pos,size,color}]}`）で保存 → `worlds/*.json` に push。GitHub Actions で `worlds/index.json` を自動生成し、出口が一覧→読み込み |
| 3Dモデルアバター | GLTFLoader（three r128 examples、jsDelivr 固定版）で GLB を読み込み。他者への配信は画像より大きいので、GitHub に置いた URL を `hi` で共有する方式が現実的 |
| ミニショップ/テナント | `config.json` にテナント定義（名前・内容）を持たせる |
| ランキング/統計 | 各自の滞在時間などを `hi` で共有し、掲示板で集計（サーバーなしなのでオンライン中の人のみ） |
| 品質 | 地面/建物テクスチャ、昼夜、BGM/効果音、アバター表情・歩行アニメ、モバイル負荷対策（影の解像度切替） |
