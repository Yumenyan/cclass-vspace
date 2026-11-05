# 開発リファレンス

## 構成
```
src/index.template.html  HTML+CSS（UI）。@@ENC@@ @@CFG@@ @@WORLD@@ @@AUTH@@ を build.py が埋め込む
src/world.js             公開層: 描画・街・建物・操作・アバター。グローバル `W`（API）を作る
src/auth.js              ログイン: ID+パスワードで暗号化済み member.js を解錠して実行
src/member.js            **暗号化層**: ネットワーク/VC/チャット/HUDリング/ドア同期/設定
tools/build.py           ビルド＆暗号化 → ルートに index.html
tools/accounts.json      アカウントID一覧（順序が個人部屋の持ち主=index）
config.json              イベント・GitHub/シート・PeerJS/ICE 設定（build時に埋込）
tests/smoke.js           jsdom+three(スタブ描画)での起動・ログイン・エレベーター・ドアの煙テスト
```
`index.html` は生成物（コミットして Pages で配信）。編集は必ず `src/` で行い build する。

## 認証（auth.js / build.py）
- 乱数の**データ鍵**（`secrets.local.json` の `datakey`、固定）で `member.js` を AES-GCM 暗号化 → `ENC.b`
- ユーザーごとに PBKDF2(password, salt, 600000) で鍵を作り、データ鍵を AES-GCM でラップ → `ENC.u[]`（`h` = sha256("cc:"+小文字ID) の先頭16桁）
- ログイン: IDハッシュで該当ユーザー検索 → 解錠 → `new Function('W', async本体)` で member.js 実行（`return true` が成功）
- ルーム名キー `W.roomKey` = sha256(データ鍵) 先頭16桁。同期の PeerJS ID 接頭辞に使う
- パスワードは端末の localStorage `cc_auth` に保存（自動ログイン）。ログアウトで削除

## 世界 API（`W`, world.js 末尾）
| 名前 | 内容 |
|---|---|
| `W.THREE / S / FH` | three.js / シーン / 1階の高さ(5) |
| `mat(color,opts)` `bx(w,h,d,x,y,z,mat,parent,{cast,recv})` | 材質キャッシュ / ボックス生成 |
| `rect(f,cx,cz,w,d,{on})` | 衝突 AABB を階 f に登録 |
| `act(f,x,z,r,label|fn,fn)` | 近接アクション（ボタン/Eキー）。label が関数なら動的、空文字なら非表示 |
| `label(text,{h,bg,fg})` / `setLabel` | テキストスプライト |
| `makeAvatar(name,color)` | `{g,body,plate,setName,setColor,setImage(url),say(t),dispose()}` |
| `local` | 自分のアバター / `me` = `{x,z,f,ry,zone,sit}` |
| `go(building,floor)` | エレベーター移動 |
| `doors[zone]`, `setDoor(zone,closed,silent)` | ドア状態。silent=true は通知なし（リモート反映用） |
| `rooms[]` | `{b,f,s,k,n,own,zone,x0,x1,z0,z1,cx,cz}` |
| `roomHandlers[kind]=fn(room)` | 部屋の機能を差し込む口（未設定なら案内ポップアップ） |
| `pop(html,title)` `toast(t)` `closePop()` | UI |
| `onTick[]` | 毎フレーム `fn(dt)`。`canToggle / onDoorChange / onKnock / onZone` はフック |

## 空間データ（world.js）
- 建物 `BD`: `{id,n,x,z,fl(階数),door(入口の向き w/e/n/s),col,rooms:[[階,slot,kind,名前,own?]]}`
- 建物内は**ローカル座標**（入口が -z 側）で記述し、`w2()` で向きに応じて回転。部屋 slot 0–5 = 左3/右3（`SL` 表）
- 階ごとに `b.G[f]` グループ。屋内にいるときは自分の階より上のグループを非表示、外壁は半透明化
- 部屋 kind: pc / multi / smash / game / library / count / private / creative（色は `RC`、案内文は `INFO`）
- ゾーン ID: 屋外 `out`、廊下 `E2`、部屋 `E2-0`

## ドアとボイスのルール
- ドアを閉めると、その部屋ゾーンは閉鎖。自分か相手のどちらかが閉鎖ゾーンにいて**ゾーンが違う**場合、声の音量は 0
- 同ゾーン同士・開放ゾーン同士は距離減衰（最大 24m、階違いは 1 階 = 8m 加算）
- 個人部屋（kind=private）は `IDS[own]` の持ち主だけが開閉可。他の人は「ノック」が全員に通知される
- 閉鎖状態は `dr` メッセージで同期（最後に操作した人が勝つ）。参加時の `hi` で現在の閉鎖一覧を共有

## 同期プロトコル（member.js, PeerJS DataChannel）
接続: ID `cclass-<roomKey>-<slot0..15>`。起動時に空き slot を取り、**自分より大きい slot** に 5 秒ごとに接続（片方向開始で重複回避）。
| t | 内容 |
|---|---|
| `hi` | `{id,name,col,av(webp dataURL),dr[閉鎖ゾーン]}` 接続直後・設定変更時 |
| `p` | `{x,z,f,ry,zn,s}` 0.1 秒ごと（変化なしなら 1 秒ハートビート） |
| `c` | `{m}` チャット/吹き出し/絵文字 |
| `dr` | `{z,c}` ドア開閉 |
音声は `peer.call()`（マイクON時のみ発信、受信は常時）→ WebAudio の GainNode で近接音量。
上限 16 同時接続。NAT が厳しい環境は `config.json` の `ice` に TURN を、自前ブローカーは `peer` に `{host,port,path,secure}` を指定。

## 拡張の手順
- 新しい部屋: `BD[].rooms` に `[階,slot,kind,名前]` を足し、`W.roomHandlers[kind]` を member.js で実装
- 新しい建物: `BD` に追加（道路・入口は `DIRS` と座標を合わせる）
- 新しいメッセージ: member.js の `onData` と `send` に `t` を追加（互換のため未知の `t` は無視される）
- 公開側（ゲストでも見える物）は world.js、メンバー専用の機能は member.js に書く
