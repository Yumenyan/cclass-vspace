# 開発リファレンス

## 構成とビルド

- `src/index.template.html`: HTMLとビルド用プレースホルダー。
- `src/style.css`: PC/タッチ/狭い画面向けのUI、フォーカス・動きを抑える設定。
- `src/icons.js`: フォント配信に依存しないSVGアイコン。
- `src/world.js`: 描画、街・建物、衝突、カメラ、移動、ドア、アバター。公開層。
- `src/motion.js`: FPSに依存しない垂直移動と、遅延バッファ/短時間の予測/角度補間の純粋関数。
- `src/atmosphere.js`: HTTP Dateの共通時計、太陽/空/星/月、UIテーマとGoogle Fonts。
- `src/details.js`: 手続き型PBR素材、建築/家具、静的部品のインスタンス化と境界。
- `src/experience.js`: 探索、ミニマップ、初回案内、設定、照明、合成環境音。公開層。
- `src/auth.js`: 暗号の解錠、ログイン、ゲスト入室。
- `src/sound.js`: 操作/ゲーム/交流の合成効果音と音量設定。
- `src/voice.js`: 送信前のRNNoise/標準処理と、送信しない比較録音。member内に挿入して暗号化。
- `src/safety.js`: アカウント別の表示/受信/入室方針。member内に挿入して暗号化。
- `src/member.js`: PeerJSメッシュ、近接通話、チャット、ドア同期。
- `src/facilities.js`: 部屋機能、共有、ゲーム、個人設定、空間JSON。member.jsの中に挿入され、**まとめて暗号化**されます。
- `tools/build.mjs`: Node標準暗号APIによるビルド。`tools/build.py` は互換用の転送先。
- `tools/prepare-pages.mjs`: 配信するファイルの許可リスト。CIでは暗号鍵を生成しません。
- `vendor/`: 固定バージョンのthree r128 / PeerJS 1.5.4 / GLTFLoaderとライセンス。ビルド時にnode_modulesからコピー。
- `tests/smoke.js`: jsdom + 実threeオブジェクト + 模擬WebRTCメッシュの統合テスト。
- `tests/visual.cjs`: 実ブラウザーの3D・レスポンシブ画面・実WebRTCの検証。画像はgitignore済みartifactsへ。

生成された `index.html` を直接編集しないでください。`npm ci && npm run build` の後に `npm test` を実行します。

## 暗号

元のエンベロープ形式を維持しています。32バイトの固定データ鍵でメンバー層全体をAES-256-GCM暗号化し、ユーザーごとのパスワードからPBKDF2-SHA256（60万回）で作った鍵でデータ鍵をラップします。IVは12バイト、saltは16バイトでビルドごとに乱数生成します。

ユーザー検索キーはsha256(`cc:`+小文字ID)の先頭16桁です。解錠後のデータ鍵ハッシュの先頭16桁を同期名に使います。ログイン情報の端末保存はチェックボックスで明示的に選んだ場合だけです。

`tools/secrets.local.json` は公開しないでください。公開成果物は `_site/index.html`、`_site/vendor/`、`_site/worlds/`、`_site/data/` だけです。ソースの暗号化は身内向けの簡易保護で、サーバーが強制する認証・権限ではありません。

## 世界API W

| API | 内容 |
|---|---|
| `THREE`, `S`, `FH`, `renderer` | ライブラリ、シーン、階高5m、描画器 |
| `mat`, `bx`, `rect` | 材質キャッシュ、箱メッシュ、階別AABB衝突 |
| `act(f,x,z,r,label,fn)` | 近接操作。labelは動的関数も可 |
| `label`, `setLabel` | スプライトの文字表示 |
| `makeAvatar(name,color)` | 名前、色、画像、吹き出し、dispose |
| `local`, `me` | 自分のアバターと `{x,z,f,ry,zone,sit}` |
| `go(building,floor)` | エレベーター付近への移動 |
| `navigate(room?)` | 探索から移動。施錠を確認し、追加空間を出る。省略すると中央庭園 |
| `doors`, `setDoor(zone,closed,silent)` | ドア状態。silentはリモート反映 |
| `rooms`, `BD`, `roomInfo` | 部屋・建物・部屋の説明 |
| `roomHandlers[kind](room)` | メンバー専用部屋の操作 |
| `pop(html,title)`, `closePop()` | ダイアログ。焦点を戻し、背景の移動を停止 |
| `setPopCleanup(fn)` | 別のダイアログを開く/閉じる際のタイマーや映像表示の片付け |
| `onTick[]` | 毎フレームのコールバック |
| `canToggle`, `onDoorChange`, `onKnock`, `onZone` | ドア/ゾーンのフック |
| `storage.get/set`, `prefs`, `applyPrefs` | 安全な端末保存、描画/音量/昼夜など |
| `explore`, `help`, `openPreferences` | 共通UI |
| `showWorlds`, `leaveCustomWorld`, `customWorld` | 追加空間への入退出 |
| `setAvatarModel(avatar,url)` | GLBを検証・読み込み・身長調整 |

ダイアログに外部入力を表示するときは `W.esc` または `textContent` を使います。リンクはHTTPSまたは同一originのみ。共有JSONからJavaScriptは実行しません。

## 街の座標と描画

館 `BD` は `{id,n,x,z,fl,door,col,rooms}`。建物内はローカル座標（入口が-z）で定義し `w2()` で回転します。部屋slotは左3/右3。ゾーンIDは屋外 `out`、廊下 `E2`、部屋 `E2-0`、追加空間 `world:<id>` です。

静的な箱は階・材質・影の設定別にInstancedMeshへまとめます。ドアとアバターは個別の可動メッシュです。**初期化時の静的箱は元のMeshを後で動かさない**でください。後から追加するターゲットやプレビューは一括化の対象外です。

移動は0.15m以下の刻みに分割して衝突判定します。カメラは同階の衝突箱で遮られ、屋内では天井より下に制限します。パネル・ログイン中・非表示タブでは移動しません。blurとvisibilitychangeで押されたキーとスティックを解除します。

## ネットワーク

Peer IDは `cclass-<roomKey>-<slot 0..15>`。各参加者は空きslotを取り、自分より大きいslotへ5秒ごとに接続します。16接続までのメッシュです。

| t | 主なフィールド |
|---|---|
| `hi` | id, name, col, av（画像dataURL）, glb, dr, minutes, noEntry（所有者の個人部屋へ入れないID） |
| `p` | x, z, f, ry, zn, s, world, y, g, vx, vz, vy, q, tm（0.1秒ごと、静止時1秒） |
| `c` | m, room（nullなら全体、ゾーンIDならその部屋） |
| `dr` | z, c（privateは接続側の名乗ったIDと持ち主を照合） |
| `file-offer` | id, name, size |
| `file-accept` | id（明示的に許可した受信者だけ） |
| `file-chunk` | id, offset, data（16,000バイト以内） |
| `file-end` | id（合計サイズが一致したら保存ボタンを表示） |
| `game-sync` / `game-move` | zone, index, reset |
| `game-state` | zone, state（選出ホストのスナップショットのみ） |
| `game-rps` / `game-rps-reset` | zone, choice |
| `game-dice` | zone, value |

着信データには文字数・座標・型・画像サイズ・送信頻度の上限を設けています。未知のtは無視します。ファイル受信は最大20MB、同時8件まで。2分進捗がなければ破棄し、自動で端末に保存しません。

通話はマイクをONにした場合だけ発信します。相手のGainNodeに距離減衰（最大24m、階差1階につき8m）を適用し、閉じた部屋の外、別の追加空間、ミュート/ブロックした人の音は消します。ブロックは端末内だけで、サーバーのBANではありません。

画面共有は別のMediaConnectionで `{kind:'screen',room}` をmetadataに付けます。同室の既知メンバーからだけ応答し、VideoTextureとパネルのvideoに表示します。送信者/受信者が退出したら映像を片付けます。音声共有は行いません。

## 空間ファイル

```json
{
  "version": 1,
  "name": "小さな部屋",
  "objects": [
    {"type":"box","pos":[0,0.5,-3],"size":[1,1,1],"color":"#8ea77b"}
  ]
}
```

typeはbox/sphere/cylinder。posは中心座標、sizeは幅/高さ/奥行。座標x,zは±90、yは0〜30、各サイズは0.1〜20、色は6桁HEX、最大150個です。低い床以外は地上で衝突します。中心近くが出現地点になるので、`[0,0,9]` 付近には大きな物体を置かないでください。

JSONインポートは200KBまで。GLBアバターは10MBまで、外部リソースを参照しないものを使います。Draco/KTX2など追加デコーダーが必要な拡張やVRM固有の表情は対象外です。

## 2.1の移動と補間

`W.me.y` はその階の床からの相対高さ、`vy` は垂直速度、`grounded` は接地、`vx/vz` は実移動速度。`W.jump()` は操作可能で接地中の場合だけtrueを返します。`W.resetMotion()` は移動先の初期化、`W.faceDirection(yaw)` は入室時の視点合わせです。

`rect` には `y0/y1`（階からの高さ）と `standable` を追加しました。プレイヤーの高さは1.8m。カメラの箱判定も実際のy0/y1を使います。床・家具の上面への着地は1/120秒以下の刻みで評価します。ジャンプ初速6.2m/s、重力18m/s²。通常ジャンプの頂点は約1.05mです。

位置パケットの `tm` は送信側の単調時計、`q` は接続ごとの連番、`y` は相対高さ、`g` は接地フラグ、`vx/vz/vy` は速度です。`W.motion` の `remote/push/sample` が受信時刻と送信間隔からジッターを見積もり、遅延バッファと限定的な外挿を行います。両端の端末時計が一致している必要はありません。過去/重複番号は無視し、階・worldの変化と14m超の移動はテレポート扱いです。

`W.clock.now()/format()/sync()` が共通時計、`W.solarAt(epoch)` が時刻だけで決まる照明パラメーターです。HTTP Dateを受け取った時点でRTTと秒精度を補正し、その後はperformance.nowで進めます。取得失敗時に偽の同期済み表示はしません。`config.json` の `worldTimeZone` は運営者共通の設定です。

`W.prefs.theme/uiMode/font` は端末別のUI設定。旧 `prefs.time` は移行時に削除します。`W.applyTheme()` で全UIと空間ラベルの書体を更新します。星や空のような環境メッシュには `userData.environment` を付け、追加空間でも表示を維持します。

描画検証は `npm test` の物理/補間と複数人統合テスト、`npm run test:browser` の実ブラウザー・共通時計・テーマ・PC/スマホ表示、`npm run test:deployment` の公開対象検証に分かれます。`W.renderPaused` は画面検証で非操作中の描画負荷を止めるためのフラグです。通常は未設定です。

## 2.2のカメラ・視点操作・音声

`W.motion.cameraDistance(origin, desired, boxes, radius)` は床/天井を含むワールド座標のAABBでカメラ球の移動範囲を求めます。遮蔽物への接近は即座に短縮し、離れると指数補間で距離を復元します。カメラ用の床スラブは物理歩行用のCOLとは別に保持します。3Dの壁はopacity=1で、上階も表示します。2Dだけは上階を非表示にします。

`W.prefs.showBuildingNames` と `headBob` は既存の保存データにもtrueで補完します。建物名はuserData.buildingNameを持つスプライト/看板だけが対象です。`W.lockPointer()/unlockPointer()/pointerLocked` はPointer Lockの状態。固定中の相対マウス移動とドラッグのイベントは二重に加算しません。パネル・Esc・blur・タブ非表示・上空表示への変更で解除します。歩行の揺れは実移動速度と接地を使い、停止時には減衰させます。

RNNoiseのラッパーは@sapphi-red/web-noise-suppressor 0.4.1。distのESM、worklet、通常/SIMD WASMとライセンスをvendorにコピーします。ビルドにはnpm ciが必要です。音声はraw → gain → highpass → RNNoise → compressor → analyser → MediaStreamDestination → PeerJS。受信の近接GainNodeは従来どおり別です。ノイズ除去はMediaStreamをWebRTCに渡す前に行い、サーバーへ処理依頼しません。

`W.voice.settings/createPipeline/pipeline/lastError` は検証と設定に使います。マイク切り替えは世代番号で古い非同期取得を破棄します。OFF/退出で入力・出力両方のトラックを止めます。録音テストは独立したパイプラインで、送信中には開始できません。RNNoiseが使えない/停止した場合は標準処理へフォールバックし、強力モード動作中と偽らない表示にします。

`W.safety.get/set/clear` はaccount IDで保存する方針。volume、chat(all/log/none)、hideAvatar、entry、avoidRoomsを独立に扱います。位置・ドア等の制御パケットはブロックしても処理し、表示/音量だけを制限します。noEntryは本人のhiだけから受け取り、対象の持ち主の個人部屋へ移動/歩行するときにW.canEnterRoomで確認。新たに拒否された状態で既に在室していれば廊下へ戻します。共有部屋の追放やオフライン時の権限強制は行いません。

`W.sfx.play(name,category)` のcategoryはui/game/world。効果音マスターと分類別設定は端末に保存します。テスト用のpreview分類はマスター音量に従います。音源は短いオシレーター音を合成し、外部の音声データは配信しません。

実ブラウザーテストはローカルPeerServerと-qa付きの隔離名を使います。合成音声fixture（マイク録音ではない）に一定のノイズを混ぜ、RNNoiseの出力と音声残存を検証します。これは特定条件での回帰テストであり、実環境の聴感品質やDiscord/Krispと同等の性能を示す測定ではありません。


## 2.3の接続管理と描画予算

`network.js` の Retry/Seen は再試行間隔と受信IDの有効期間を管理します。member.js は接続中Mapを持ち、同時試行2件、接続待ち12秒、相手の再試行2〜60秒（ジッターあり）、仲介の再接続750ms〜30秒。既存のDataConnectionを仲介の再接続だけでは捨てません。RTCのfailed/closedまたは90秒の無応答で接続を再構築します。disconnectedは15秒の猶予を置きます。ファイルは別の受信制限と送信バッファ待ちを使います。

`W.network.status` は仲介の状態、試行中/接続中の件数と直近の問題、retry()は手動再試行です。設定画面には開いた時点の診断を表示します。hiの後は60秒ごとにstatusだけを送信し、プロフィール画像の不要な再配信を避けます。チャットのmidはUUID、送信者IDとの組で5分/最大2048件を記録。旧版は1.2秒の内容比較に限定します。

`performance.js` は W.performance.level/apply()/refresh()/shouldRender(now)。autoはタッチ端末・4GB以下・4論理コア以下でlow、それ以外でmediumから始め、持続する低フレームレートでlowに下げます。明示した品質は自動変更しません。low/medium/highの画素比上限は1/1.25/2、描画上限は30/45/60fps、部屋の詳細の距離は28/50/1000mです。近くの階と現在の部屋を優先し、上空視点では全室を表示します。低品質の単純形状は元の形状を保持して切替時に復元します。高品質でのMSAAは起動時の設定で決まります。

家具のインスタンス化は部屋/建築グループ単位。部屋の家具だけをLOD対象にして壁の不透明性を維持します。COLは8mの階別グリッドに登録し、追加/削除で再構築、ドアのonは照会時に評価。カメラ用AABBはキャッシュし、最大カメラ距離に接する範囲だけを照会します。

2026-11-05の実ブラウザー回帰検証では、同一庭園視点でhighが161,354三角形/394 draw calls、lowが119,608三角形/309 draw calls。描画形状約26%、呼出し約22%減。SwiftShaderでの比較であり、実PCのFPS改善率を示す値ではありません。仲介の切断後の復帰、RTC切断後の再接続、復帰後チャットと重複排除も検証しました。


## 3.1の追加モジュール

traversal.jsは歩ける階段の支持面、コース、HUD、完走結果、公開のゲート形状を生成。W.walkSurfaces()/walkHeight()をworld.jsの移動/垂直計算から呼びます。W.traversalは診断と検証用。座標移動はW.walkTo()でも同じ判定を通ります。

editor.jsのW.attachEditor()は既存draftの参照を共有し、選択indexを通知。数値編集とプレビューを同じデータで同期します。portals.jsはアカウント別の保存と公開ゲートのラベルを結びつけます。

member.jsのmesh-roster / mesh-send / mesh-deliverはデータの一段中継。virtual DataConnectionはrelayに中継者IDを保持します。物理接続のpendingは仮想接続とは別に残し、直接接続への昇格ができます。12秒の経路有効期間と既存のend-to-end Pingを使い、中継者が退室した場合も別経路を探索します。詳しい制限はUPDATE-3.1.mdを参照してください。
