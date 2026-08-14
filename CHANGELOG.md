Warning: truncated output (original token count: 66578)
Total output lines: 3879

## Unreleased

### General

### Client
- Feat: NookのPolicyとFeature Flagを管理する画面を追加
- Feat: 管理画面からユーザーの国・確認済み年齢区分・Policyを設定できるように

### Server
- Feat: NookのPolicyとFeature Flagを管理する管理者APIを追加
- Feat: 投稿作成時にNook Policy Engineの権限判定を適用
- Feat: Nookのユーザー安全設定を管理するAPIを追加
- Feat: 画像・動画付き投稿とChat送信時にNook Policy Engineの権限判定を適用

## 2026.7.0

### Note

**今回のリリースではMisskeyの各種動作要件が変更されます。必ずアップグレード前にお使いの環境をご確認ください。**

- センシティブメディアの判定 (NSFW検出) が、本体に内蔵された nsfwjs による推論から、外部サービス [sensitive-detector](https://github.com/misskey-dev/sensitive-detector) への HTTP 呼び出し方式に変更されました。
	- これに伴い、本体から `nsfwjs` / `@tensorflow/tfjs` / `@tensorflow/tfjs-node` および同梱の NSFW 判定モデルが削除され、インストール要件 (ネイティブ ML スタック) が緩和されました。
	- **センシティブ判定機能を利用しているサーバーは対応が必要です。** 別途 [sensitive-detector](https://github.com/misskey-dev/sensitive-detector) サービスを立ち上げ、コントロールパネルの「モデレーション > センシティブなメディアの検出」で接続先 URL を設定してください。接続先が未設定の場合、センシティブ判定は行われません (すべて非センシティブ扱い)。
	- 画像の正規化・動画フレームの抽出・しきい値判定・集約は引き続き本体側で行われ、外部サービスには正規化済み画像の推論のみを委譲します。
- Node.js v24, v26 をサポートしました。**Node.js v22 でも動作しますが、今後のリリースで v22 のサポートを終了する予定**ですので、Node.js のアップデートをご検討ください。
  - Node.js のセキュリティアップデートに伴い、最低動作バージョンを 22.22.2 / 24.17.0 / 26.4.0 に引き上げました。
  - Docker Image は Node.js 26.4.0-trixie に更新されています。
- バックエンドで画像処理に用いているライブラリ sharp のシステム要件の変更により、**SSE4.2 命令セットをサポートしていない x86_64 CPU では Misskey が正しく動作しなくなります**。仮想マシンに Misskey をデプロイしている場合や、古いハードウェアをお使いの場合は、アップデート前にお使いの環境をご確認ください。なお、ARM64 など x86_64 ではない環境においてはこの変更による影響はありません。
- YAMLパーサーをアップデートし、より厳格なチェックが行われるようになりました。起動時にconfigの読み取りで構文エラーが発生する可能性があります。\
  例えば `allowPrivateNetworks` を 2026.6.0 までの `example.yml` の構文を元に記述している場合は、配列の閉じ括弧のインデントを上げるか、リスト表示に書き換える必要があります。詳しくは https://github.com/misskey-dev/misskey/pull/17701 をご覧ください。

### General
- Feat: コントロールパネルから二要素認証を解除できるように
- Feat: 条件に一致したURLプレビューのサムネイルを隠すことができるように  
  (Based on https://github.com/MisskeyIO/misskey/pull/214)
- Enhance: 依存関係の更新

### Client
- 2025.4.0 以前の設定情報の移行処理が削除されました
	- 2025.4.0 から直接 2026.6.0 以上にアップデートする場合は設定が移行されませんので注意してください。移行したい場合は一度 2026.5.1 を経由してください。
- Enhance: 画像ビューワーを刷新・動画プレイヤーを統合
  - 操作性の改善
  - ビューワーとMisskeyの各種機能との統合を強化
  - パフォーマンスの向上
  - Enhance: マウスホイールで拡大縮小できるように
  - Fix: 幅が狭い画面で動画の再生が困難な問題を修正
  - Fix: 一部の画像のみセンシティブなとき、ビューワー内で画像を切り替えるとセンシティブな画像がそのまま表示される問題を修正
  - Fix: 一部の画像をビューワーで読み込んだ際に正しく表示されない問題を修正
- Enhance: ファイルアップロード前にプレビューできるように
- Enhance: タブがバックグラウンドの間は必要ない定期更新処理を停止するように
- Enhance: 翻訳の更新
- Fix: 「画像を新しいタブで開く」が機能しなくなっていた問題を修正
- Fix: デバイスタイプをスマートフォンに固定している状態で画面幅が広いとき、画面左上のアイコンが表示されない問題を修正
- Fix: チャットでIMEの変換を確定するEnterでメッセージが送信されてしまうことがある問題を修正
- Fix: 自分へのメンションに対する色分けで、判定が大文字/小文字を区別していた問題を修正
- Fix: いくつかのイベントリスナーが正しく解除されない問題を修正（メモリ使用量の改善）
- Fix: 非ログイン時トップページをスクロール操作できないことがある問題を修正
- Fix: ローカルユーザーへのホスト付きメンションが本文に含まれる指名ノートの作成時、投稿フォームにて、当該ユーザーが宛先に含まれていても正しく認識されない問題を修正
- Fix: チャートの描画終了後にリソースが解放されない問題を修正
- Fix: ドライブの「このファイルからノートを作成」やギャラリーの「ノートで共有」、誕生日ウィジェットからのノート作成において、通常投稿の下書きが表示される問題を修正
- Fix: QRコードリーダーがページを離れても停止しない問題を修正
- Fix: ノートの詳細表示で削除された引用元が表示されない問題を修正

### Server
- Feat: ログ基盤の刷新
  - API内部エラーのログに構造化属性と正規化したエラー情報を付与し、認証情報を自動的に秘匿するように（従来形式の表示は維持）
  - ログ全体の既定出力レベルとドメインごとの出力レベルを設定できるように
  - バックエンドのログを1行JSON形式で出力できるように
  - SentryのTrace ContextをJSON形式のログへ関連付けられるように
  - HTTPのAccess logをstatus class単位で出力できるように（開発時のリクエスト・レスポンス本文、SentryのTrace Contextにも対応）
- Enhance: Sentry バックエンドの自動計装を `sentryForBackend.disabledIntegrations` で個別に無効化できるように
- Enhance: センシティブメディアの判定を外部サービス ([sensitive-detector](https://github.com/misskey-dev/sensitive-detector)) に分離し、`nsfwjs` / `@tensorflow/tfjs(-node)` の同梱と NSFW 判定モデルを廃止 (#16804)
- Enhance: Node.js 22.22.2以降、24.17.0以降、26.4.0以降をサポートするように
- Enhance: Docker Image の Node.js を 26.4.0 に、Debian を trixie (v13) に更新
- Enhance: URLプレビューの結果を内部でキャッシュするように
- Fix: `/stats` API のレスポンス型が正しくない問題を修正
- Fix: ハッシュタグに関連するデータを更新する際のエラーハンドリングを修正
- Fix: Sentry 使用環境下にて、Misskey が発行した SQL クエリが span に含まれない問題を修正
- Fix: Sentry 使用環境下にて、外部送信リクエストへ `sentry-trace` / `baggage` ヘッダーが既定で付与されないように
- Fix: フォロワー限定投稿へのリプライをホーム投稿に出来る問題を修正
- Fix: ファイルをアップロードするAPIにて、処理終了後に一時ファイルが削除されないことがある問題を修正
- Fix: 初期設定で作成したアカウント以外でアカウント作成APIが使用できない問題を修正
- Fix: フォロー中のチャンネルを再度フォローした際にALREADY_FOLLOWINGエラーを返すように
- Fix: セキュリティに関する修正

## 2026.6.0

### General
- Feat: ジョブキュー管理画面からキューの一時停止/再開ができるように
- Feat: アンテナのタイムラインから個別のノートを削除できるように
- Feat: ノート検索で投稿日時の期間を条件に加えられるように(#16035)
- Fix: コンパネからrootユーザーのパスワードをリセットしようとした際にエラーが通知されない問題を修正

### Client
- Enhance: ユーザーページのファイルタブでスクロール位置が保持されるように
- Enhance: ドライブページでスクロール位置が保持されるように
- Enhance: 絵文字のメニューから直接絵文字パレットに絵文字を追加できるように
- Fix: URLプレビューのプレイヤーをウィンドウで開いたとき、プレイヤーが読み込まれるまでの間 `Invalid URL` と表示される問題を修正
- Fix: 一部の実績が正しく表示されない問題を修正
- Fix: アクセストークン発行時のダイアログのタイトルが「確認コード」となっているのを修正
- Fix: 一部のUI要素の色が正しく表示されない問題を修正  
  (Cherry-picked from https://github.com/MisskeyIO/misskey/pull/1243)
- Fix: 「D」キーでダークモードを切り替える際にsyncDeviceDarkModeのチェックがバイパスされる問題を修正
- Fix: パスキー登録完了時の認証ダイアログの入力値が使われていない問題を修正
- Fix: メンションのサジェスト時に表示されるアイコン表示が画像サイズ次第で崩れる問題を修正
- Fix: ノートの下書きをリセットする際、未アップロードのファイルについては添付予定が解除されない問題を修正
- Fix: 画像アップロード時、フレームのキャプション付与が正しく行われないことがある問題を修正

### Server
- Enhance: リモートノートクリーニングジョブのスキップ処理のパフォーマンス改善
- Enhance: リモートノートクリーニングジョブの削除対象検索処理のパフォーマンス改善
- Enhance: ActivityPub の画像添付に width/height を含めるように
- Enhance: URLプレビューのデフォルトの User Agent に Misskey サーバーのURLを含めるように
- Fix: backend バンドルで `@tensorflow/tfjs-node` を external に含めず、起動時に `@mapbox/node-pre-gyp` の `find()` が backend の package.json を誤検出して `is not node-pre-gyp ready` エラーを永続的に吐く問題を修正
- Fix: MemoryKVCacheのキャッシュGC処理において、更新されたキャッシュが期限切れにならないことがある問題を修正
- Fix: PerUserDriveChart がシステム所有ファイル (userId が null) の更新で `"group"` の非NULL制約違反によりクラッシュする問題を修正 (#17498)
- Fix: センシティブメディア自動検出周りの依存関係・ファイルの解決に失敗する問題を修正
- Fix: フォロワー限定投稿を指名投稿で引用した際に、引用した投稿の公開範囲が意図せず変更される問題を修正
- Fix: `actor` を持たない不正なInboxアクティビティを受信した際に配送ジョブが `TypeError` でクラッシュする問題を修正 (受信時に検証して400で返し、ジョブを積まないように変更)
- Fix: Startup and shutdown failures (port-in-use, socket permission denied, plugin timeouts, leaked WebSocket connections) are now reported through the misskey logger instead of an UnhandledPromiseRejectionWarning stack trace
- Fix: リモートのノートに対するメンション数制限が、サーバーが解決できたユーザー数ベースで行われていた問題を修正
- Fix: セキュリティに関する修正

## 2026.5.4

### General
- セキュリティに関する修正

### Client
- Fix: ビルドに失敗することがある問題を修正


## 2026.5.3

### General
- Fix: Dockerで起動に失敗する問題を修正


## 2026.5.2

### Note
- config に `threadPoolSize` オプションが追加されました。
  - デフォルトは `1` で、ワーカーごとに指定した数のスレッドが作成されます。
  - スレッドプールは CPU バウンドな処理をオフロードするために使用されるため、みだりに大きな値を指定しないでください。

### General
- Enhance: Unicode 17.0 に収録されている絵文字の処理・表示に対応
  - Fluent Emojiや端末ネイティブの絵文字を利用している場合は、最新の絵文字に対応しておらず正しく表示できない可能性があります。絵文字が表示できない場合は、表示に使用する絵文字をTwemojiに切り替えてご利用ください。
- Enhance: 投稿通知設定したユーザーをリストで見ることができるように
- 依存関係の更新

### Client
- Enhance: テーマのプレビュー時、リロードせずにもとのテーマに戻せるように
- Enhance: Fluent Emojiを更新し、Unicode 15+相当の絵文字の表示に対応
- Fix: テーマエディター使用時に、最初の変更のみ適用される問題を修正
- Fix: テーマのプレビュー時、既存のテーマとIDが被っている場合にプレビューできない問題を修正
- Fix: テーマのインストールエラーの表示を改善
- Fix: リスト編集画面におけるユーザー追加時のユーザー選択ダイアログにおいて、自身のアカウントが検索結果の一覧に表示されない問題を修正
- Fix: デッキのカラムから開いたアンテナ・リストの編集ウィンドウを、"ポップアウト"、"新しいタブで表示"、"リンクをコピー"した場合に誤ったリンクが与えられる問題を修正
- Fix: チャンネルの作成ロールポリシーにて、ヘッダーにロールポリシーの値が表示されない問題を修正

### Server
- Enhance: RSA 署名処理のオフロード


## 2026.5.1

### General
- Enhance: チャンネルの作成の可否をロールポリシーで制御できるように
- Fix: `.devcontainer/compose.yml`のvolumeのマウントパスを修正

### Client
- Enhance: ノートの詳細表示での公開範囲の表示を改善  
  (Cherry-picked from https://github.com/kokonect-link/cherrypick/commit/ecc75563f4e428b66adccc379bf317b5b21ed8e6)
- Fix: ロール設定画面でロールをアサイン/アサイン解除した際、リロードしなくても画面に反映されるよう修正

### Server
- Fix: ID生成アルゴリズムにULIDを使用している場合に通知が約10秒遅延する問題を修正
- Fix: 公開範囲がフォロワーの投稿が通知されない問題を修正
- Fix: URLプレビューが動作しない問題を修正


## 2026.5.0

### General
- Enhance: アバターデコレーションにカテゴリを設定できるように

### Client
- Enhance: チャンネル指定リノートでリノート先のチャンネルに移動できるように
- Enhance: ベータ版でのアップデート時のダイアログの更新情報リンクをGitHubのReleasesページに遷移するようにし、正しく閲覧できるように
- Fix: 一部のページ内リンクが正しく動作しない問題を修正
- Fix: ドライブへの画像アップロード時にファイル名の変更が無視される不具合を修正
- Fix: 連合が無効化されたサーバーで一部の設定項目が空欄で表示される問題を修正
- Fix: オーディオ、動画の再生速度メニューが開けない問題を修正

### Server
- Enhance: メモリ使用量を削減
- Enhance: 起動の高速化  
  (Cherry-picked from https://github.com/MisskeyIO/misskey/pull/1410)
- Enhance: バックエンドの開発モード時の安定性向上
- Enhance: バックエンドビルド・テスト時に使用する依存関係の整理（swc/esbuild→Rolldown, Jest→Vitest）
- Fix: ファイルシステムを用いる処理におけるパスの取り扱いを改善
- Fix: `/api-doc` にアクセスできない問題を修正
- Fix: support `alsoKnownAs` from remote actors as either array or unwrapped singleton
- Fix: ローカルに存在しないリモートアカウントに対するアカウント削除リクエストを受信した際に、そのユーザーを新規作成して削除する挙動を修正
- Fix: Inboxでの特定のエラーによる失敗はDelayedにしない
- Fix: ID生成アルゴリズムにULIDを使用している場合にMisskeyが正しく動作しない問題を修正
- Fix: リレー経由で届いたノートがリノートとして表示される問題を修正
- Fix: robots.txtの内容を調整
- Fix: 特定のユーザーに管理者権限を持つロールが複数ついている際に、取得できるユーザーIDが重複する問題を修正  
  (Cherry-picked from https://github.com/lqvp/misskey-tempura/commit/17ed4108cec4b6bd2fd989db5a9091db91fa37a7)
- Fix: ブロックしたサーバーからのInboxジョブが蓄積し続ける問題を修正  
  (Cherry-picked from https://github.com/lqvp/misskey-tempura/commit/3f0f4bfe923f2b3a7837017b54841598f421c6ef)
- Fix: support activity with `actor` as an id string or embedded object in inbox processor and ActivityPub inbox service
- Fix: コンフィグファイルに `meilisearch` の設定がある状態でほかの検索プロバイダを利用すると、UI上からリモートのノートの検索ができない問題を修正
- Fix: ノートに関する通知で公開範囲が考慮されていない問題を修正  
  (Cherry-picked from https://github.com/lqvp/misskey-tempura/commit/cbce96c520a138b8bcd16890ff6f2952830fa166 originally presented in https://github.com/yojo-art/cherrypick/pull/743)

## 2026.3.2

### General
- 依存関係の更新

### Client
- Enhance: アプリ内ウィンドウの初期サイズを画面サイズに応じて自動で調整するように
- Fix: 絵文字パレットが空の状態でMisskeyについてのページが閲覧できない問題を修正
- Fix: ウィンドウのタイトルをクリックしても最前面に出ないことがある問題を修正

### Server
- Fix: 自分の行ったフォロワー限定投稿または指名投稿に自分自身でリアクションなどを行った場合のイベントが流れない問題を修正
- Fix: 署名付きGETリクエストにおいてAcceptヘッダを署名の対象から除外（Acceptヘッダを正規化するCDNやリバースプロキシを使用している際に挙動がおかしくなる問題を修正）
- Fix: WebSocket接続におけるノートの非表示ロジックを修正
- Fix: チャンネルミュートを有効にしている際に、一部のタイムラインやノート一覧が空になる問題を修正
- Fix: 初期読込時に必要なフロントエンドのアセットがすべて読み込まれていない問題を修正


## 2026.3.1

### General
- 依存関係の更新

### Server
- Fix: セキュリティに関する修正


## 2026.3.0

### Note
- `users/following` の `birthday` プロパティは非推奨になりました。代わりに `users/get-following-users-by-birthday` をご利用ください。

### General
- Enhance: 「もうすぐ誕生日のユーザー」ウィジェットで、誕生日が至近のユーザーも表示できるように
  (Cherry-picked from https://github.com/MisskeyIO/misskey)
	- 「今日誕生日のユーザー」は「もうすぐ誕生日のユーザー」に名称変更されました
- Fix: ユーザーハッシュタグページでユーザーの読み込みが重複する問題を修正
- 依存関係の更新

### Client
- Enhance: ドライブのファイル一覧で自動でもっと見るを利用可能に
- Enhance: ウィジェットの表示設定をプレビューを見ながら行えるように
- Enhance: ウィジェットの設定項目のラベルの多言語対応
- Enhance: 画面幅が広いときにメディアを横並びで表示できるようにするオプションを追加
- Enhance: パフォーマンスの向上
- Fix: ドライブクリーナーでファイルを削除しても画面に反映されない問題を修正 #16061
- Fix: 非ログイン時にログインを求めるダイアログが表示された後にダイアログのぼかしが解除されず操作不能になることがある問題を修正
- Fix: ドライブのソートが「登録日（昇順）」の場合に正しく動作しない問題を修正
- Fix: 高度なMFMのピッカーを使用する際の挙動を改善
- Fix: 管理画面でアーカイブ済のお知らせを表示した際にアクティブなお知らせが多い旨の警告が出る問題を修正
- Fix: ファイルタブのセンシティブメディアを開く際に確認ダイアログを出す設定が適用されない問題を修正
- Fix: 2月29日を誕生日に設定している場合、閏年以外は3月1日を誕生日として扱うように修正
- Fix: `Mk:C:container` の `borderWidth` が正しく反映されない問題を修正
- Fix: mCaptchaが正しく動作しない問題を修正
- Fix: 非ログイン時にリバーシの対局が表示されない問題を修正
- Fix: ノートの詳細表示でリアクションが全件表示されない問題を修正
- Fix: 動画埋め込みプレイヤーなどの一部ウィンドウで、ウィンドウのサイズ変更や移動が正常に行えない問題を修正
- Fix: 画像エフェクトの修正
  - 塗りつぶし・モザイク・ぼかしエフェクトを回転させると歪む問題を修正
  - モザイクの格子のサイズが画像の縦横比によって長方形となる問題を修正
  - モザイクの色味がより自然になるように修正
  - ぼかしに不自然な縦線が入る問題を修正
- Fix: フォロー承認通知でフォローされた際のメッセージの絵文字が表示されない問題を修正
- Fix: HTTP環境など（Secure Contextのない環境）で、設定画面が閲覧できない問題を修正

### Server
- Enhance: OAuthのクライアント情報取得（Client Information Discovery）において、IndieWeb Living Standard 11 July 2024で定義されているJSONドキュメント形式に対応しました
  - JSONによるClient Information Discoveryを行うには、レスポンスの`Content-Type`ヘッダーが`application/json`である必要があります
  - 従来の実装（12 February 2022版・HTML Microformat形式）も引き続きサポートされます
- Enhance: メモリ使用量を削減
- Fix: `/admin/get-user-ips` エンドポイントのアクセス権限を管理者のみに修正

## 2025.12.2

### Note
v2025.12.0で行われた「configの`trustProxy`のデフォルト値を`false`に変更」について、正しく環境に応じた設定を行わないとサインインが困難になるといった状態を緩和するために、以下の対応を行いました。

**正しく設定しないと、上記のような不具合の原因となったり、セキュリティリスクが高まったりする可能性があります。必ず現在のconfigをご確認の上、必要に応じて値を変更してください。**

- `trustProxy`について、デフォルト（configに値が設定されていない状態）ではループバックアドレスとローカルIPアドレス空間を信頼するようにしました。
- `trustProxy`の設定方法について、より詳細に記述しました。
- リバースプロキシやCDNなどのより上流のレイヤでレートリミットを設定したい場合や、緊急時の一時的な緩和策として、Misskey内部でのIPアドレスペースでのレートリミットを無効化できるようにしました。

### General
- 依存関係の更新

### Client
- Enhance: デッキのUI説明を追加
- Enhance: 設定がブラウザによって消去されないようにするオプションを追加
- Fix: バージョン表記のないPlayが正しく動作しない問題を修正
  バージョン表記のないものは v0.x 系として実行されます。v1.x 系で動作させたい場合は必ずバージョン表記を含めてください。
- Fix: デッキUIでメニュー位置を下にしているとプロファイル削除ボタンが表示されないのを修正
- Fix: 一部のUnicode絵文字のリアクションがボタンにならない問題を修正

### Server
- Enhance: Misskey内部でのIPアドレスペースでのレートリミットを無効化できるように
  - リバースプロキシやCDNなど別のレイヤで別途レートリミットを設定する場合や、ローカルでのテスト用途等として利用することを想定しています。
  - デフォルトは `enableIpRateLimit: true`（Misskey内部でのIPアドレスペースでのレートリミットは有効）です。
- Fix: コントロールパネルのジョブキューページで使用される一部APIの応答速度を改善

## 2025.12.1

### Client
- Fix: 特定の条件下でMisskeyが起動せず空白のページが表示されることがある問題を軽減
- Fix: 初回読み込み時などに、言語設定で不整合が発生することがある問題を修正
- Fix: 削除されたノートのリノートが正しく動作されない問題を修正
- Fix: チャンネルオーナーが削除済みの時にチャンネルのヘッダーメニューが表示されない不具合を修正
- Fix: ドライブで登録日以外でソートする場合は月でグループ化して表示しないように
- Fix: `null` を返す note_view_intrruptor プラグインが動作しない問題を修正

### Server
- Fix: ジョブキューでSentryが有効にならない問題を修正


## 2025.12.0

### Note
- configの`trustProxy`のデフォルト値を`false`に変更しました。アップデート前に現在のconfigをご確認の上、必要に応じて値を変更してください。

### Client
- Fix: stacking router viewで連続して戻る操作を行うと何も表示されなくなる問題を修正

### Server
- Enhance: メモリ使用量を削減しました
- Enhance: ActivityPubアクティビティを送信する際のパフォーマンス向上
- Enhance: 依存関係の更新
- Fix: セキュリティに関する修正

## 2025.11.1

### Client

- Enhance: リアクションの受け入れ設定にキャプションを追加 #15921
- Fix: ページの内容がはみ出ることがある問題を修正
- Fix: ナビゲーションバーを下に表示しているときに、項目数が多いと表示が崩れる問題を修正
- Fix: ヘッダーメニューのチャンネルの新規作成の項目でチャンネル作成ページに飛べない問題を修正 #16816
- Fix: ラジオボタンに空白の選択肢が表示される問題を修正
  (Cherry-picked from https://github.com/MisskeyIO/misskey/pull/1105)
- Fix: 一部のシチュエーションで投稿フォームのツアーが正しく表示されない問題を修正
- Fix: 投稿フォームのリセットボタンで注釈がリセットされない問題を修正
- Fix: PlayのAiScriptバージョン判定（v0.x系・v1.x系の判定）が正しく動作しない問題を修正
  (Cherry-picked from https://github.com/MisskeyIO/misskey/pull/1129)
- Fix: フォロー申請をキャンセルする際の確認ダイアログの文言が不正確な問題を修正
- Fix: 初回読み込み時にエラーになることがある問題を修正
- Fix: お気に入りクリップの一覧表示が正しく動作しない問題を修正
- Fix: AiScript Misskey 拡張APIにおいて、各種関数の引数で明示的に `null` が指定されている場合のハンドリングを修正

### Server
- Enhance: メモリ使用量を削減しました
- Enhance: 依存関係の更新
- Fix: ワードミュートの文字数計算を修正
- Fix: チャンネルのリアルタイム更新時に、ロックダウン設定にて非ログイン時にノートを表示しない設定にしている場合でもノートが表示されてしまう問題を修正
- Fix: DeepL APIのAPIキー指定方式変更に対応
  (Cherry-picked from https://github.com/MisskeyIO/misskey/pull/1096)
	- 内部実装の変更にて対応可能な更新です。Misskey側の設定方法に変更はありません。
- Fix: DBレプリケーションを利用する環境でクエリーが失敗する問題を修正
  (Cherry-picked from https://github.com/MisskeyIO/misskey/pull/1123)

## 2025.11.0

### General
- Feat: チャンネルミュート機能の実装 #10649
	- チャンネルの概要画面の右上からミュートできます（リンクコピー、共有、設定と同列）
- Enhance: Node.js 24.10.0をサポートするようになりました
- Enhance: DockerのNode.jsが24.10.0に更新されました
- 依存関係の更新

### Client
- Feat: 画像にメタデータを含むフレームをつけられる機能
- Enhance: プリセットを作成しなくても画像にウォーターマークを付与できるように
- Enhance: 管理しているチャンネルの見分けがつきやすくなるように
- Enhance: プロフィールへのリンクをユーザーポップアップのアバターに追加
- Enhance: ユーザーのノート、フォロー、フォロワーページへのリンクをユーザーポップアップに追加
- Enhance: プッシュ通知を行うための権限確認をより確実に行うように
- Enhance: 投稿フォームのチュートリアルを追加
- Enhance: 「自動でもっと見る」をほとんどの箇所で利用可能に
- Enhance: アンテナ・リスト設定画面とタイムラインの動線を改善
	- アンテナ・リスト一覧画面の項目を選択すると、設定画面ではなくタイムラインに移動するようになりました
	- アンテナ・リストの設定画面の右上にタイムラインに移動するボタンを追加しました
- Fix: 紙吹雪エフェクトがアニメーション設定を考慮せず常に表示される問題を修正
- Fix: ナビゲーションバーのリアルタイムモード切替ボタンの状態をよりわかりやすく表示するように
- Fix: ページのタイトルが長いとき、はみ出る問題を修正
- Fix: 投稿フォームのアバターが正しく表示されない問題を修正 #16789
- FIx: カスタム絵文字(β)画面で変更行が正しくハイライトされない問題を修正 #16626

### Server
- Enhance: Remote Notes Cleaningが複雑度が高いノートの処理を中断せずに次のノートから再開するように
- Fix: チャンネルの説明欄の最小文字数制約を除去

## 2025.10.2

### Client
- Fix: アプリ内からキャッシュをクリアするとテーマ再適用するまでレンダリングが正しく行われない問題を修正
- Fix: 期限が無期限のアンケートに投票できない問題を修正

## 2025.10.1

### General
- Enhance: リモートユーザーに付与したロールバッジを表示できるように（オプトイン）
  パフォーマンス上の問題からデフォルトで無効化されています。「コントロールパネル > パフォーマンス」から有効化できます。
- 依存関係の更新

### Client
- Enhance: デッキのメインカラムのヘッダをクリックしてページ上部/下部にスクロールできるように
- Enhance: 下書き/予約投稿一覧は投稿フォームのアカウントメニュー内に移動し、下書き保存は「...」メニュー内に移動されました
- Fix: カスタム絵文字画面(beta)のaliasesで使用される区切り文字が一致していないのを修正 #15614
- Fix: バナー画像の幅が表示領域と一致していない問題を修正
- Fix: 一部のブラウザでバナー画像が上下中央に表示されない問題を修正
- Fix: ナビゲーションバーの設定で削除した項目をその場で再追加できない問題を修正
- Fix: ロールポリシーによりダイレクトメッセージが無効化されている際のデッキのダイレクトメッセージカラムの挙動を改善
- Fix: 画像のマスクでタッチ操作が不安定な問題を修正
- Fix: ウォーターマークの各種挙動修正
  - ウォーターマークを回転させると歪む問題を修正
  - ウォーターマークを敷き詰めると上下左右反転した画像/文字が表示される問題を修正
  - ウォーターマークを回転させた際に画面からはみ出た部分を考慮できるように
- Fix: 投票が終了した後に投票結果が正しく表示されない問題を修正
- Fix: ダークモードの同期が機能しない場合がある問題を修正
- Fix: iOSで動画の圧縮を行うと音声トラックが失われる問題を修正

### Server
- Enhance: 管理者/モデレーターはファイルのアップロード制限をバイパスするように
- Enhance: セキュリティの向上

## 2025.10.0

### NOTE
- pnpm 10.16.0 が必要です
- ロールのインポート機能の利用可否ポリシーのデフォルト値が「いいえ」に変わったため、デフォルトから変更していないサーバーでは適宜設定を変更してください。
- ロールのアップロード可能なファイル種別ポリシーのデフォルト値に「text/*」が追加されたため、デフォルトから変更していないサーバーでは適宜設定を変更してください。

### General
- Feat: 予約投稿ができるようになりました
	- デフォルトで作成可能数は1になっています。適宜ロールのポリシーで設定を行ってください。
- Enhance: 広告ごとにセンシティブフラグを設定できるようになりました
- Enhance: 依存関係の更新
- Enhance: 翻訳の更新

### Client
- Feat: アカウントのQRコードを表示・読み取りできるようになりました
- Feat: 動画を圧縮してアップロードできるようになりました
- Feat: (実験的) ブラウザ上でノートの翻訳を行えるように
- Enhance: チャットの日本語名称がダイレクトメッセージに戻るとともに、ベータ版機能ではなくなりました
- Enhance: 画像編集にマスクエフェクト(塗りつぶし、ぼかし、モザイク)を追加
- Enhance: 画像編集の集中線エフェクトを強化
- Enhance: ウォーターマークにアカウントのQRコードを追加できるように
- Enhance: テーマをドラッグ&ドロップできるように
- Enhance: 絵文字ピッカーのサイズをより大きくできるように
- Enhance: カスタム絵文字が多い場合にサーバーの絵文字一覧ページがフリーズしないように
- Enhance: 時刻計算のための基準値を一か所で管理するようにし、パフォーマンスを向上
- Enhance: 「お問い合わせ」ページから、バグの調査等に役立つ情報（OSやブラウザのバージョン等）を取得・コピーできるように
- Fix: iOSで、デバイスがダークモードだと初回読み込み時にエラーになる問題を修正
- Fix: アクティビティウィジェットのグラフモードが動作しない問題を修正
- Fix: ユニコード絵文字の追加辞書をインストールするとユニコード絵文字が絵文字ピッカーで検索できなくなる絵文字があるバグを修正

### Server
- Enhance: ユーザーIPを確実に取得できるために設定ファイルにFastifyOptions.trustProxyを追加しました

## 2025.9.0

### Client
- Enhance: AiScriptAppウィジェットで構文エラーを検知してもダイアログではなくウィジェット内にエラーを表示するように
- Enhance: /flushページでサイトキャッシュをクリアできるようになりました
- Enhance: クリップ/リスト/アンテナ/ロール追加系メニュー項目において、表示件数を拡張
- Enhance: 「キャッシュを削除」ボタンでブラウザの内部キャッシュの削除も行えるように
- Enhance: Ctrlキー（Commandキー）を押下しながらリンクをクリックすると新しいタブで開くように
- Fix: プッシュ通知を有効にできない問題を修正
- Fix: RSSティッカーウィジェットが正しく動作しない問題を修正
- Fix: プロファイルを復元後アカウントの切り替えができない問題を修正
- Fix: エラー画像が横に引き伸ばされてしまう問題に対応

### Server
- Fix: webpなどの画像に対してセンシティブなメディアの検出が適用されていなかった問題を修正

## 2025.8.0

### Note
- サポートされるNode.jsの最小バージョンが**22.15.0**になりました

### General
- ノートを削除した際、関連するノートが同時に削除されないようになりました
	- APIで、「replyIdが存在しているのにreplyがnull」や「renoteIdが存在しているのにrenoteがnull」であるという、今までにはなかったパターンが表れることになります
- 定期的に古いリモートの投稿を削除する機能が実装されました
	- コントロールパネル→パフォーマンス→Remote Notes Cleaning で有効化できます
	- データベースの肥大化を防止することが可能です
	- 既存のサーバーで当機能を有効化した場合は、処理量が多くなるため、一時的にストレージ使用量が増加する可能性があります。
		- 増加量を抑えるには、最大処理継続時間をデフォルトより短くしてください。
  - データベースサイズへの効果が見られない場合はautovacuumが有効になっているか確認してください
- サーバーの初期設定が完了するまでは連合がオンにならないようになりました
- 日本語における公開範囲名称の「ダイレクト」が「指名」に改称されました
  - 実際の動作に即した名称になり、馴染みのない人でも理解しやすくなりました
  - 他サービスにおける「ダイレクトメッセージ」に相当するMisskeyの機能は「チャット」ですが(過去のバージョンのMisskeyでも、当該機能は「チャット」ではなく「ダイレクトメッセージ」でした)、「ダイレクト投稿」という名称の機能が存在するとそちらがダイレクトメッセージ機能であるような誤解を生んでいました
    - 今後、「チャット」の名称を「ダイレクトメッセージ」に戻す可能性があります
- mfm.jsをアップデートしました
  - Enhance: Unicode 15.1 および 16.0 に収録されている絵文字に対応
  - Enhance: acctに `.` が入っているユーザーのメンションに対応
  - Fix: Unicode絵文字に隣接する異体字セレクタ（`U+FE0F`）が絵文字として認識される問題を修正
- Enhance: ユーザー検索をロールポリシーで制限できるように

### Client
- Feat: AiScriptが1.1.0に更新されました
	- プラグインは1.xに対応したものが必要です
	- Playはそのまま動作しますが、新規に作られるプリセットは1.xになります
	- 以前のバージョンから無効化されていた note_view_interruptor が有効になりました
		- ハンドラは同期的である必要があります
- Feat: セーフモード
	- プラグイン・テーマ・カスタムCSSの使用でクライアントの起動に問題が発生した際に、これらを無効にして起動できます
	- 以下の方法でセーフモードを起動できます
		- `g` キーを連打する
		- URLに`?safemode=true`を付ける
		- PWAのショートカットで Safemode を選択して起動する
- Feat: 非ログイン時に表示されるトップページのスタイルを選択できるように
	- コントロールパネル→ブランディング→エントランスページのスタイル
- Feat: ページのタブバーを下部に表示できるように
- Feat: (実験的)iOSでの触覚フィードバックを有効にできるように
- Feat: コントロールパネルを検索できるように
- Enhance: 「自動でもっと見る」オプションが有効になり、安定性が向上しました
- Enhance: トルコ語 (tr-TR) に対応
- Enhance: 不必要な翻訳データを読み込まなくなり、パフォーマンスが向上しました
- Enhance: 画像エフェクトのパラメータ名の多言語対応
- Enhance: ノートを非表示にする相対期間を1ヶ月単位で自由に指定できるように
- Enhance: メールアドレス確認画面のUIを改善
- Enhance: アイコンのスクロール追従を無効化する際の適用範囲を強化
- Enhance: レンダリングパフォーマンスの向上
- Enhance: 依存ソフトウェアの更新
- Fix: 投稿フォームでファイルのアップロードが中止または失敗した際のハンドリングを修正
- Fix: 一部の設定検索結果が存在しないパスになる問題を修正
  (Cherry-picked from https://activitypub.software/TransFem-org/Sharkey/-/merge_requests/1171)
- Fix: テーマエディタが動作しない問題を修正
- Fix: チャンネルのハイライトページにノートが表示されない問題を修正
- Fix: カラムの名前が正しくリスト/チャンネルの名前にならない問題を修正
- Fix: 複数のメンションを1行に記述した場合に、サジェストが正しく表示されない問題を修正
- Fix: メンションとしての条件を満たしていても、特定の条件(`-`が含まれる場合など)で正しくサジェストされない問題を一部修正
- Fix: ユーザーの前後ノートを閲覧する機能が動作しない問題を修正
- Fix: 照会ダイアログでap/showでローカルユーザーを解決した際@username@nullに飛ばされる問題を修正
- Fix: アイコンのデコレーションを付ける際にデコレーションが表示されなくなる問題を修正
- Fix: タッチ操作時にマウスホバー時のユーザープレビューが開くことがある問題を修正
- Fix: 管理中アカウント一覧で正しい表示が行われない問題を修正
- Fix: lookupページでリモートURLを指定した際に正しく動作しない問題を修正

### Server
- Feat: サーバー管理コマンド
	- `pnpm cli foo` の形式で実行可能です
	- 現在以下のコマンドが利用可能です
		- `reset-captcha` - CAPTCHA設定をリセットします
- Enhance: ノートの削除処理の効率化
- Enhance: 全体的なパフォーマンスの向上
- Enhance: 依存ソフトウェアの更新
- Enhance: `clips/list` APIがページネーションに対応しました
- Fix: `notes/mentions` で場合によっては並び順が正しく返されない問題を修正
- Fix: SystemWebhook設定でsecretを空に出来ない問題を修正
- Fix: 削除されたユーザーがチャットメッセージにリアクションしている場合`chat/history`などでエラーになる問題を修正
- Fix: Pageのアイキャッチ画像をドライブから消してもPageごと消えないように
- Fix: タイムラインAPIの withRenotes: false 時のレスポンスを修正


## 2025.7.0

### Note
- Node.jsの最小バージョンを20.10.0から20.18.1に引き上げました
  - なお、特に必要がない限りNode.jsは推奨バージョンであるv22を使用するようにしてください

### General
- Feat: ノートの下書き機能
- Feat: クリップ内でノートを検索できるように
- Feat: Playを検索できるように
- Feat: モデレーションにおいて、特定のドライブファイルを添付しているチャットメッセージを一覧できるように
- Enhance: ウォーターマーク機能をロールで制御可能に

### Client
- Note: 「自動でもっと見る」オプションは無効になっています
- Feat: モデログを検索できるように
- Enhance: 設定の自動バックアップをオンにした直後に自動バックアップするように
- Enhance: ファイルアップロード前にキャプション設定を行えるように
- Enhance: ファイルアップロード時にセンシティブ設定されているか表示するように
- Enhance: 投稿フォームにファイルをペースト/ドロップした際のUXを改善
- Enhance: ページネーション(一覧表示)の並び順を逆にできるように
- Enhance: ページネーション(一覧表示)の基準日時を指定できるように
- Enhance: レンダリングパフォーマンスの向上
- Fix: ファイルがドライブの既定アップロード先に指定したフォルダにアップロードされない問題を修正
- Fix: プラグインをアンインストールしてもセーブデータが残る問題を修正
- Fix: 数時間後Misskeyのタブに戻った際に、タブがスロットリングされている間の更新アニメーションを延々見せ続けられる問題を修正
- Fix: 非ログイン時のハイライトノートの画像がCWの有無を考慮せず表示される問題を修正
- Fix: レンジ選択・ドロップダウンにて、操作を無効にすべきところで無効にならない問題を修正
- Fix: Pull to refreshが有効なときに横スクロールができない問題を修正

### Server
- Enhance: sinceId/untilIdが指定可能なエンドポイントにおいて、sinceDate/untilDateも指定可能に
- Enhance: メールの送信者としてサーバー名を表示するように (サーバー名が設定されている場合)
- Fix: ジョブキューのProgressの値を正しく計算する


## 2025.6.3

### Client
- Fix: キャッシュを削除しないとクライアントが使用できないことがある問題を修正

## 2025.6.2

### Client
- Fix: キャッシュを削除しないとクライアントが使用できないことがある問題を修正
- 翻訳の更新

## 2025.6.1

### Note
- AiScript Misskey拡張API（Misskey Webプラグイン）の[note_view_interruptor](https://misskey-hub.net/ja/docs/for-developers/plugin/plugin-api-reference/#pluginregister_note_view_interruptorfn)は不具合の影響により現在一時的に無効化されています。
- Misskey Web投稿フォームのプレビュー切り替えは「...」メニュー内に配置されました

### Client
- Feat: 画像にウォーターマークを付与できるようになりました
- Feat: 画像の加工ができるようになりました(実験的)
- Enhance: ノートのリアクション一覧で、押せるリアクションを優先して表示できるようにするオプションを追加
- Enhance: 全てのチャットメッセージを既読にできるように(設定→その他)
- Enhance: ミュートした絵文字をデバイス間で同期できるように
- Fix: ドライブファイルの選択が不安定な問題を修正
- Fix: コントロールパネルのファイル欄などのデザインが崩れている問題を修正
- Fix: ユーザーの検索結果を追加で読み込むことができない問題を修正
- Fix: タッチ操作時にチャートのツールチップが消えなくなる場合がある問題を修正
- Fix: ウェルカムタイムラインでリアクションが表示されない問題を修正
- Fix: デッキのタイムラインカラムで新着ノート時のサウンドが再生されない問題を修正

### Server
- Feat: 全てのチャットメッセージを既読にするAPIを追加(chat/read-all)
- Fix: アカウント削除が正常に行われないことがあった問題を修正
- Fix: outboxのページネーションが正しく行われない問題を修正

### Misskey.js
- Fix: misskey-jsの drive/file/create でファイルアップロードができない問題を修正

## 2025.6.0

### Client
- Enhance: 非同期的なコンポーネントの読み込み時のハンドリングを強化
- Fix: リアクションの一部の絵文字が重複して表示されることがある問題を修正
- Fix: 非利用者に対するユーザー作成コンテンツの公開範囲が全て非公開になっている場合にログインできない問題を修正

### Server
- Fix: 非利用者に対するユーザー作成コンテンツの公開範囲が全て非公開になっている場合でもusers/showを許可するように

## 2025.5.1

### Note
- 設定ファイルの以下の項目がコントロールパネルから設定するようになりました
  - signToActivityPubGet
  - proxyRemoteFiles
  - disallowExternalApRedirect
    - 許可しないかどうかではなく、許可するかどうかの設定(allowExternalApRedirect)になりました

### General
- Feat: 非ログインでサーバーを閲覧された際に、サーバー内のコンテンツを非公開にすることができるようになりました
  - モデレーションが行き届きにくい不適切なリモートコンテンツなどが、自サーバー経由で図らずもインターネットに公開されてしまうことによるトラブル防止などに役立ちます
  - 「全て公開(今までの挙動)」「ローカルのコンテンツだけ公開(=サーバー内で受信されたリモートのコンテンツは公開しない)」「何も公開しない」から選択できます
  - デフォルト値は「ローカルのコンテンツだけ公開」になっています
- Feat: ロールでアップロード可能なファイル種別を設定可能になりました
	- デフォルトは**テキスト、JSON、画像、動画、音声ファイル**になっています。zipなど、その他の種別のファイルは含まれていないため、必要に応じて設定を変更してください。
	- 場合によってはファイル種別を正しく検出できないことがあります(特にテキストフォーマット)。その場合、ファイル種別は application/octet-stream と見做されます。
		- したがって、それらの種別不明ファイルを許可したい場合は application/octet-stream を指定に追加してください。
- Feat: プレビュー先がリダイレクトを伴う場合、リダイレクト先のコンテンツを取得しに行くか否かを設定できるように(#16043)
- Enhance: UIのアイコンデータの読み込みを軽量化

### Client
- Feat: ドライブのUIが強化されました
  - 複数のファイルをまとめて移動できるようになりました
- Feat: ファイルのアップロードUIが一新されました
  - アップロード前にファイル情報を確認できるようになりました
	- 圧縮の品質を選択できるようになりました
	- アップロードに失敗したときに再試行できるようになりました
	- アップロード前に画像のクロッピングを行えるようになりました
	- ファイルサイズのチェックは圧縮後の実際にアップロードされるサイズで行われるようになりました
	- ファイルのアップロードを中断できるようになりました
- Feat: サーバー初期設定ウィザードが実装されました
  - 簡単なウィザードに従うだけで、サーバーに最適な設定が適用されます
- Feat: Websocket接続を行わずにMisskeyを利用するNo Websocketモードが実装されました(beta)
  - サーバーのパフォーマンス向上に寄与することが期待されます
	- 何らの理由によりWebsocket接続が行えない環境でも快適に利用可能です
  - 従来のWebsocket接続を行うモードはリアルタイムモードとして再定義されました
	- チャットなど、一部の機能は引き続き設定に関わらずWebsocket接続が行われます
- Feat: 絵文字をミュート可能にする機能
  - 絵文字（ユニコードの絵文字・カスタム絵文字）毎にミュートし、不可視化することができるようになりました
- Feat: モバイルデバイスで折りたたまれたUIの展開表示に全画面ページを使用できるように(実験的)
- Enhance: 設定の同期をオンにするときに競合したときに値をマージできるように
- Enhance: メモリ使用量を軽減しました
- Enhance: 画像の高品質なプレースホルダを無効化してパフォーマンスを向上させるオプションを追加
- Enhance: 招待されているが参加していないルームを開いたときに、招待を承認するかどうか尋ねるように
- Enhance: リプライ元にアンケートがあることが表示されるように
- Enhance: ノートのサーバー情報のデザインを改善・パフォーマンス向上
  (Based on https://github.com/taiyme/misskey/pull/198, https://github.com/taiyme/misskey/pull/211, https://github.com/taiyme/misskey/pull/283)
- Enhance: ユーザー設定でURLプレビューを無効化できるように
- Enhance: ヒントとコツを追加
- Enhance: ヒントとコツを再表示できるように
- Enhance: AiScriptからtoastを表示する関数 `Mk:toast` を追加
- Enhance: シンタックスハイライトのエンジンをJavaScriptベースのものに変更
  - フロントエンドの読み込みサイズを軽量化しました
	- ほとんどの言語のハイライトは問題なく行えますが、互換性の問題により一部の言語が正常にハイライトできなくなる可能性があります。詳しくは https://shiki.style/references/engine-js-compat をご覧ください。
- Fix: チャットに動画ファイルを送付すると、動画の表示が崩れてしまい視聴出来ない問題を修正
- Fix: アカウント依存かつ初期状態である設定値をサーバー同期しようとした際に正しくコンフリクト検出されない問題を修正
- Fix: "時計"ウィジェット(Clock)において、Transparent設定が有効でも、その背景が透過されない問題を修正
- Fix: 一定時間操作がなかったら動画プレイヤーのコントロールを隠すように
- Fix: Twitchのクリップがプレイヤーで再生できない問題を修正

### Server
- Enhance: リストやフォローをエクスポートする際にリプライを含むかどうかの情報を含むように
- Enhance: チャットルームの最大メンバー数を30人から50人に調整
- Enhance: ノートのレスポンスにアンケートが添付されているかどうかを示すフラグ`hasPoll`を追加
- Enhance: チャットルームのレスポンスに招待されているかどうかを示すフラグ`invitationExists`を追加
- Enhance: レートリミットの計算方法を調整 (#13997)
- Enhance: 外部サイトのOGPのキャッシュ期間を調整
- Fix: チャットルームが削除された場合・チャットルームから抜けた場合に、未読状態が残り続けることがあるのを修正
- Fix: ユーザ除外アンテナをインポートできない問題を修正
- Fix: アンテナのセンシティブなチャンネルのノートを含むかどうかの情報がエクスポートされない問題を修正
- Fix: ミュート対象ユーザーが引用されているノートがRNされたときにミュートを貫通してしまう問題を修正 #16009
- Fix: 連合モードが「なし」の場合に、生成されるHTML内のactivity jsonへのリンクタグを省略するように
- Fix: コントロールパネルから招待コードを作成すると作成者の情報が記録されない問題を修正
- Fix: コントロールパネルのジョブキューページからPausedなジョブ一覧を閲覧できない問題を修正

## 2025.5.0

### Note
- DockerのNode.jsが22.15.0に更新されました

### Client
- Feat: マウスで中ボタンドラッグによりタイムラインを引っ張って更新できるように
  - アクセシビリティ設定からオフにすることもできます
- Enhance: タイムラインのパフォーマンスを向上
- Enhance: バックアップされた設定のプロファイルを削除できるように
- Fix: 一部のブラウザでアコーディオンメニューのアニメーションが動作しない問題を修正
- Fix: ダイアログのお知らせが画面からはみ出ることがある問題を修正
- Fix: ユーザーポップアップでエラーが生じてもインジケーターが表示され続けてしまう問題を修正

### Server
- Enhance: 凍結されたユーザのノートが各種タイムラインで表示されないように `#15775`
- Enhance: 連合先のソフトウェア及びバージョン名により配信停止を行えるように `#15727`
- Enhance: 2025.4.1 で追加されたインデックスの再生成をノートの追加しながら行えるようになりました。 `#15915`
  - `MISSKEY_MIGRATION_CREATE_INDEX_CONCURRENTLY` 環境変数を `1` にセットしていると、巨大なテーブルの既存のカラムに関するインデックス再生成が`CREATE INDEX CONCURRENTLY`を使用するようになりました。
  - 複数のサーバープロセスをクラスタリングしているサーバーにおいて、一部のプロセスが起動している状態でこのオプションを有効にしてマイグレーションすることにより、ダウンタイムを削減することができます。
  - ただし、このオプションを有効にする場合、インデックスの作成にかかる時間が倍~3倍以上になることがあります。
  - また、大きなインスタンスである場合にはインデックスの作成に失敗し、複数回再試行する必要がある可能性があります。
- Fix: チャンネルのフォロー一覧の結果が一部正しくないのを修正 (#12175)
- Fix: ファイルをアップロードした際にファイル名が常に untitled になる問題を修正
- Fix: ファイルのアップロードに失敗することがある問題を修正
  - 投稿フォーム上で画像のクロップを行うと、`Invalid Param.`エラーでノートが投稿出来なくなる問…36578 tokens truncated…いように

### Bugfixes
- 全ての通知が削除されてしまうのを修正

## 13.7.3 (2023/02/23)

### Note
~~13.7.0以前から直接このバージョンにアップデートする場合は全ての通知が削除**されません。**~~

### Improvements

### Bugfixes
- Client: 「キャッシュを削除」した後、ローカルのカスタム絵文字が表示されなくなるされなくなる問題を修正
- Client: 通知設定画面で以前からグループの招待を有効化していた場合、通知の表示に失敗する問題の修正
- Client: 通知設定画面に古いトグルが残っていた問題を修正

## 13.7.2 (2023/02/23)

### Note
13.7.0以前からアップデートする場合は全ての通知が削除されます。

### Improvements
- enhance: make pwa icon maskable
- chore(client): tweak custom emoji size

### Bugfixes
- マイグレーションが失敗することがあるのを修正

## 13.7.1 (2023/02/23)

### Improvements
- pnpm buildではswcを使うように

### Bugfixes
- NODE_ENV=productionでビルドできないのを修正

## 13.7.0 (2023/02/22)

### Changes
- チャット機能が削除されました

### Improvements
- Server: URLプレビュー（summaly）はプロキシを通すように
- Client: 2FA設定のUIをまともにした
- セキュリティキーの名前を変更できるように
- enhance(client): add quiz preset for play
- 広告開始時期を設定できるように
- みつけるで公開ロール一覧とそのメンバーを閲覧できるように
- enhance(client): MFMのx3, x4が含まれていたらノートをたたむように
- enhance(client): make possible to reload page of window

### Bugfixes
- ユーザー検索ダイアログでローカルユーザーを絞って検索できない問題を修正
- fix(client): MkHeader及びデッキのカラムでチャンネル一覧を選択したとき、最大5個までしか表示されない
- 管理画面の広告を10個以上見えるように
- Moderation note が保存できない
- ユーザーのハッシュタグ検索が機能していないのを修正

## 13.6.1 (2023/02/12)

### Improvements
- アニメーションを少なくする設定の時、MkPageHeaderのタブアニメーションを無効化
- Backend: activitypub情報がcorsでブロックされないようヘッダーを追加
- enhance: レートリミットを0%にできるように
- チャンネル内Renoteを行えるように

### Bugfixes
- Client: ユーザーページでアクティビティを見ることができない問題を修正

## 13.6.0 (2023/02/11)

### Improvements
- MkPageHeaderをごっそり変えた
  * モバイルではヘッダーは上下に分割され、下段にタブが表示されるように
  * iconOnlyのタブ項目がアクティブな場合にはタブのタイトルを表示するように
  * メインタイムラインではタイトルを表示しない
  * メインタイムラインかつモバイルで表示される左上のアバターを選択するとアカウントメニューが開くように
- ユーザーページのノート一覧をタブとして分離
- コンディショナルロールもバッジとして表示可能に
- enhance(client): ロールをより簡単に付与できるように
- enhance(client): 一度見たノートのRenoteは省略して表示するように
- enhance(client): 迷惑になる可能性のある投稿を行う前に警告を表示
- リアクションの数が多い場合の表示を改善
- 一部のMFM構文をopt-outに

### Bugfixes
- Client: ユーザーページでタブがほとんど見れないことがないように

## 13.5.6 (2023/02/10)

### Improvements
- 非ログイン時にMiAuthを踏んだ際にMiAuthであることを表示する
- /auth/のUIをアップデート
- 利用規約同意UIの調整
- クロップ時の質問を分かりやすく

### Bugfixes
- fix: prevent clipping audio plyr's tooltip

## 13.5.4 (2023/02/09)

### Improvements
- Server: UIのHTML（ノートなどの特別なページを除く）のキャッシュ時間を15秒から30秒に
- i/notificationsのレートリミットを緩和

### Bugfixes
- fix(client): validate url to improve security
- fix(client): dateの初期値が正常に入らない時がある

## 13.5.3 (2023/02/09)

### Improvements
- Client: デッキにチャンネルカラムを追加

## 13.5.2 (2023/02/08)

### Changes
- Revert: perf(client): do not render custom emojis in user names

### Bugfixes
- Client: register_note_view_interruptor not working
- Client: ログイントークンの再生成が出来ない

## 13.5.0 (2023/02/08)

### Changes
- perf(client): do not render custom emojis in user names

### Improvements
- Client: disableShowingAnimatedImagesのデフォルト値をprefers-reduced-motionにする
- enhance(client): tweak medialist style

### Bugfixes
- fix docker health check
- Client: MkEmojiPickerでもChromeで検索ダイアログで変換確定するとそのまま検索されてしまうのを修正
- fix(mfm): default degree not used in rotate
- fix(server): validate urls from ap to improve security

## 13.4.0 (2023/02/05)

### Improvements
- ロールにアイコンを設定してユーザー名の横に表示できるように
- feat: timeline page for non-login users
- 実績の単なるラッキーの獲得確立を調整
- Add Thai language support

### Bugfixes
- fix(server): 自分のノートをお気に入りに登録しても実績解除される問題を修正
- fix(server): clean up file in FileServer
- fix(server): Deny UNIX domain socket
- fix(server): validate filename and emoji name to improve security
- fix(client): validate input response in aiscript
- fix(client): add webhook delete button
- fix(client): tweak notification style
- fix(client): インラインコードを折り返して表示する

## 13.3.3 (2023/02/04)

### Bugfixes
- Server: improve security

## 13.3.2 (2023/02/04)

### Improvements
- 外部メディアプロキシへの対応を強化しました
  外部メディアプロキシのFastify実装を作りました
  https://github.com/misskey-dev/media-proxy
- Server: improve performance

### Bugfixes
- Client: validate urls to improve security

## 13.3.1 (2023/02/04)

### Bugfixes
- Client: カスタム絵文字にアニメーション画像を再生しない設定が適用されていない問題を修正
- Client: オートコンプリートでUnicode絵文字がカスタム絵文字として表示されてしまうのを修正
- Client: Fix Vue-plyr CORS issue
- Client: validate urls to improve security

## 13.3.0 (2023/02/03)
### Changes
- twitter/github/discord連携機能が削除されました
- ハッシュタグごとのチャートが削除されました
- syslogのサポートが削除されました

### Improvements
- ロールで広告の非表示が有効になっている場合は最初から広告を非表示にするように

## 13.2.6 (2023/02/01)
### Changes
- docker-compose.ymlをdocker-compose.yml.exampleにしました。docker-compose.ymlとしてコピーしてから使用してください。

### Improvements
- 絵文字ピッカーのパフォーマンスを改善
- AiScriptを0.12.4に更新

### Bugfixes
- Server: リレーと通信できない問題を修正
- Client: classicモード使用時にwindowサイズによってdefaultに変更された後に、windowサイズが元に戻ったらclassicに戻すように修正 #9669
- Client: Chromeで検索ダイアログで変換確定するとそのまま検索されてしまう問題を修正

## 13.2.4 (2023/01/27)
### Improvements
- リモートカスタム絵文字表示時のパフォーマンスを改善
- Default to `animation: false` when prefers-reduced-motion is set
- リアクション履歴が公開なら、ログインしていなくても表示できるように
- tweak blur setting
- tweak custom emoji cache

### Bugfixes
- fix aggregation of retention
- ダッシュボードでオンラインユーザー数が表示されない問題を修正
- フォロー申請・フォローのボタンが、通知から消えている問題を修正

## 13.2.3 (2023/01/26)
### Improvements
- カスタム絵文字の更新をリアルタイムで反映するように

### Bugfixes
- turnstile-failed: missing-input-secret

## 13.2.2 (2023/01/25)
### Improvements
- サーバーのパフォーマンスを改善

### Bugfixes
- サインイン時に誤ったレートリミットがかかることがある問題を修正
- MFMのposition、rotate、scaleで小数が使えない問題を修正

## 13.2.1 (2023/01/24)
### Improvements
- デザインの調整
- サーバーのパフォーマンスを改善

## 13.2.0 (2023/01/23)

### Improvements
- onlyServer / onlyQueue オプションを復活
- 他人の実績閲覧時は獲得条件を表示しないように
- アニメーション減らすオプション有効時はリアクションのアニメーションを無効に
- カスタム絵文字一覧のパフォーマンスを改善

### Bugfixes
- Aiscript: button is not defined

## 13.1.7 (2023/01/22)

### Improvements
- 新たな実績を追加
- MFMにscaleタグを追加

## 13.1.4 (2023/01/22)

### Improvements
- 新たな実績を追加

### Bugfixes
- Client: ローカリゼーション更新時にリロードが繰り返されることがあるのを修正

## 13.1.3 (2023/01/22)

### Bugfixes
- Client: リアクションのカスタム絵文字の表示の問題を修正

## 13.1.2 (2023/01/22)

### Bugfixes
- Client: リアクションのカスタム絵文字の表示の問題を修正

## 13.1.1 (2023/01/22)

### Improvements
- ローカルのカスタム絵文字を表示する際のパフォーマンスを改善
- Client: 瞬間的に大量の実績を解除した際の挙動を改善

### Bugfixes
- Client: アップデート時にローカリゼーションデータが更新されないことがあるのを修正

## 13.1.0 (2023/01/21)

### Improvements
- 実績機能
- Playのプリセットを追加
- Playのscriptの文字数制限を緩和
- AiScript GUIの強化
- リアクション一覧詳細ダイアログを表示できるように
- 存在しないカスタム絵文字をテキストで表示するように
- Alt text in image viewer
- ジョブキューのプロセスとWebサーバーのプロセスを分離

### Bugfixes
- playを削除する手段がなかったのを修正
- The … button on notes does nothing when not logged in
- twitterと連携するときに autwh is not a function になるのを修正

## 13.0.0 (2023/01/16)

### TL;DR
- New features (Role system, Misskey Play, New widgets, New charts, 🍪👈, etc)
- Rewriten backend
- Better performance (backend and frontend)
- Various usability improvements
- Various UI tweaks

### Notable features
- ロール機能
	- 従来より柔軟にユーザーのポリシーを管理できます。例えば、「インスタンスのパトロンはアンテナを30個まで作れる」「基本的にLTLは見れないが、許可した人だけ見れる」「招待制インスタンスだけどユーザーなら誰でも他者を招待できる」のような運用はもちろん、「ローカルユーザーかつアカウント作成から1日未満のユーザーはパブリックな投稿を行えない」のように複数条件を組み合わせて、自動でロールを付与する設定も可能です。
- Misskey Play
	- 従来の動的なPagesに代わる、新しいプラットフォームです。動的なコンテンツ(アプリケーション)に特化していて、Pagesに比べてはるかに柔軟なアプリケーションを作成可能です。

### Changes
#### For server admins
- Node.js 18.x or later is required
- PostgreSQL 15.x is required
	- Misskey not using 15 specific features at 13.0.0, but may do so in the future.
	- Docker環境でPostgreSQLのアップデートを行う際のガイドはこちら: https://github.com/misskey-dev/misskey/pull/9641#issue-1536336620
- Elasticsearchのサポートが削除されました
	- 代わりに今後任意の検索プロバイダを設定できる仕組みを構想しています。その仕組みを使えば今まで通りElasticsearchも利用できます
- Yarnからpnpmに移行されました
  corepackの有効化を推奨します: `sudo corepack enable`
- インスタンスブロックはサブドメインにも適用されるようになります
- ロールの導入に伴い、いくつかの機能がロールと統合されました
	- モデレーターはロールに統合されました。今までのモデレーター情報は失われるため、予めモデレーター一覧を記録しておき、アップデート後にモデレーターロールを作りアサインし直してください。
	- サイレンスはロールに統合されました。今までのユーザーは恩赦されるため、予めサイレンス一覧を記録しておくのをおすすめします。
	- ユーザーごとのドライブ容量設定はロールに統合されました。
	- インスタンスデフォルトのドライブ容量設定はロールに統合されました。アップデート後、ベースロールもしくはコンディショナルロールでドライブ容量を編集してください。
	- LTL/GTLの解放状態はロールに統合されました。
- Dockerの実行をrootで行わないようにしました。Dockerかつオブジェクトストレージを使用していない場合は`chown -hR 991.991 ./files`を実行してください。
  https://github.com/misskey-dev/misskey/pull/9560

#### For users
- ノートのウォッチ機能が削除されました
- アンケートに投票された際に通知が作成されなくなりました
- ノートの数式埋め込みが削除されました
- 新たに動的なPagesを作ることはできなくなりました
	- 代わりにAiScriptを用いてより柔軟に動的なコンテンツを作成できるMisskey Play機能が実装されています。
- AiScriptが0.12.2にアップデートされました
	- 0.12.xの変更点についてはこちら https://github.com/syuilo/aiscript/blob/master/CHANGELOG.md#0120
	- 0.12.x未満のプラグインは読み込むことはできません
- iOS15以下のデバイスはサポートされなくなりました
- Firefox110以下はサポートされなくなりました
  - 109でもContainerQueriesのフラグを有効にする事で問題なく使用できます

#### For app developers
- API: metaのレスポンスに`emojis`プロパティが含まれなくなりました
	- カスタム絵文字一覧情報を取得するには、`emojis`エンドポイントにリクエストします
- API: カスタム絵文字エンティティに`url`プロパティが含まれなくなりました
	- 絵文字画像を表示するには、`<instance host>/emoji/<emoji name>.webp`にリクエストすると画像が返ります。
	- e.g. `https://p1.a9z.dev/emoji/misskey.webp`
	- remote: `https://p1.a9z.dev/emoji/syuilo_birth_present@mk.f72u.net.webp`
- API: `user`および`note`エンティティに`emojis`プロパティが含まれなくなりました
- API: `user`エンティティに`avatarColor`および`bannerColor`プロパティが含まれなくなりました
- API: `instance`エンティティに`latestStatus`、`lastCommunicatedAt`、`latestRequestSentAt`プロパティが含まれなくなりました
- API: `instance`エンティティの`caughtAt`は`firstRetrievedAt`に名前が変わりました

### Improvements
- Role system @syuilo
- Misskey Play @syuilo
- Introduce retention-rate aggregation @syuilo
- Make possible to export favorited notes @syuilo
- Add per user pv chart @syuilo
- Push notification of Antenna note @tamaina
- AVIF support @tamaina
- Add Cloudflare Turnstile CAPTCHA support @CyberRex0
- レートリミットをユーザーごとに調整可能に @syuilo
- 非モデレーターでも、権限を持つロールをアサインされたユーザーはインスタンスの招待コードを発行できるように @syuilo
- 非モデレーターでも、権限を持つロールをアサインされたユーザーはカスタム絵文字の追加、編集、削除を行えるように @syuilo
- クリップおよびクリップ内のノートの作成可能数を設定可能に @syuilo
- ユーザーリストおよびユーザーリスト内のユーザーの作成可能数を設定可能に @syuilo
- ハードワードミュートの最大文字数を設定可能に @syuilo
- Webhookの作成可能数を設定可能に @syuilo
- ノートをピン留めできる数を設定可能に @syuilo
- Server: signToActivityPubGet is set to true by default @syuilo
- Server: improve syslog performance @syuilo
- Server: Use undici instead of node-fetch and got @tamaina
- Server: Judge instance block by endsWith @tamaina
- Server: improve note scoring for featured notes @CyberRex0
- Server: アンケート選択肢の文字数制限を緩和 @syuilo
- Server: プロフィールの文字数制限を緩和 @syuilo
- Server: add rate limits for some endpoints @syuilo
- Server: improve stats api performance @syuilo
- Server: improve nodeinfo performance @syuilo
- Server: delete outdated notifications regularly to improve db performance @syuilo
- Server: delete outdated hard-mutes regularly to improve db performance @syuilo
- Server: delete outdated notes of antenna regularly to improve db performance @syuilo
- Server: improve activitypub deliver performance @syuilo
- Client: use tabler-icons instead of fontawesome to better design @syuilo
- Client: Add new gabber kick sounds (thanks for noizenecio)
- Client: Add link to user RSS feed in profile menu @ssmucny
- Client: Compress non-animated PNG files @saschanaz
- Client: YouTube window player @sim1222
- Client: show readable error when rate limit exceeded @syuilo
- Client: enhance dashboard of control panel @syuilo
- Client: Vite is upgraded to v4 @syuilo, @tamaina
- Client: HMR is available while yarn dev @tamaina
- Client: Implement the button to subscribe push notification @tamaina
- Client: Implement the toggle to or not to close push notifications when notifications or messages are read @tamaina
- Client: show Unicode emoji tooltip with its name in MkReactionsViewer.reaction @saschanaz
- Client: OpenSearch support @SoniEx2 @chaoticryptidz
- Client: Support remote objects in search @SoniEx2
- Client: user activity page @syuilo
- Client: Make widgets of universal/classic sync between devices @tamaina
- Client: add user list widget @syuilo
- Client: Add AiScript App widget
- Client: add profile widget @syuilo
- Client: add instance info widget @syuilo
- Client: Improve RSS widget @tamaina
- Client: add heatmap of daily active users to about page @syuilo
- Client: introduce fluent emoji @syuilo
- Client: add new theme @syuilo
- Client: add new mfm function (position, fg, bg) @syuilo
- Client: show fireworks when visit user who today is birthday @syuilo
- Client: show bot warning on screen when logged in as bot account @syuilo
- Client: AiScriptからカスタム絵文字一覧を参照できるように @syuilo
- Client: improve overall performance of client @syuilo
- Client: ui tweaks @syuilo
- Client: clicker game @syuilo

### Bugfixes
- Server: Fix @tensorflow/tfjs-core's MODULE_NOT_FOUND error @ikuradon
- Server: 引用内の文章がnyaizeされてしまう問題を修正 @kabo2468
- Server: Bug fix for Pinned Users lookup on instance @squidicuzz
- Server: Fix peers API returning suspended instances @ineffyble
- Server: trim long text of note from ap @syuilo
- Server: Ap inboxの最大ペイロードサイズを64kbに制限 @syuilo
- Server: アンテナの作成数上限を追加 @syuilo
- Server: pages/likeのエラーIDが重複しているのを修正 @syuilo
- Server: pages/updateのパラメータによってはsummaryの値が更新されないのを修正 @syuilo
- Server: Escape SQL LIKE @mei23
- Server: 特定のPNG画像のアップロードに失敗する問題を修正 @usbharu
- Server: 非公開のクリップのURLでOGPレンダリングされる問題を修正 @syuilo
- Server: アンテナタイムライン（ストリーミング）が、フォローしていないユーザーの鍵投稿も拾ってしまう @syuilo
- Server: follow request list api pagination @sim1222
- Server: ドライブ容量超過時のエラーが適切にレスポンスされない問題を修正 @syuilo
- Client: パスワードマネージャーなどでユーザー名がオートコンプリートされない問題を修正 @massongit
- Client: 日付形式の文字列などがカスタム絵文字として表示されるのを修正 @syuilo
- Client: case insensitive emoji search @saschanaz
- Client: 画面の幅が狭いとウィジェットドロワーを閉じる手段がなくなるのを修正 @syuilo
- Client: InAppウィンドウが操作できなくなることがあるのを修正 @tamaina
- Client: use proxied image for instance icon @syuilo
- Client: Webhookの編集画面で、内容を保存することができない問題を修正 @m-hayabusa
- Client: Page編集でブロックの移動が行えない問題を修正 @syuilo
- Client: update emoji picker immediately on all input @saschanaz
- Client: チャートのツールチップが画面に残ることがあるのを修正 @syuilo
- Client: fix wrong link in tutorial @syuilo

### Special thanks
- All contributors
- All who have created instances for the beta test
- All who participated in the beta test

## 12.119.1 (2022/12/03)
### Bugfixes
- Server: Mitigate AP reference chain DoS vector @skehmatics

## 12.119.0 (2022/09/10)

### Improvements
- Client: Add following badge to user preview popup @nvisser
- Client: mobile twitter url can be used as widget @caipira113
- Client: Improve clock widget @syuilo

### Bugfixes
- マイグレーションに失敗する問題を修正
- Server: 他人の通知を既読にできる可能性があるのを修正 @syuilo
- Client: アクセストークン管理画面、アカウント管理画面表示できないのを修正 @futchitwo

## 12.118.1 (2022/08/08)

### Bugfixes
- Client: can not show some setting pages @syuilo

## 12.118.0 (2022/08/07)

### Improvements
- Client: 設定のバックアップ/リストア機能
- Client: Add vi-VN language support
- Client: Add unix time widget @syuilo

### Bugfixes
- Server: リモートユーザーを正しくブロックできるように修正する @xianonn
- Client: 一度作ったwebhookの設定画面を開こうとするとページがフリーズする @syuilo
- Client: MiAuth認証ページが機能していない @syuilo
- Client: 一部のアプリからファイルを投稿フォームへドロップできない場合がある問題を修正 @m-hayabusa

## 12.117.1 (2022/07/19)

### Improvements
- Client: UIのブラッシュアップ @syuilo

### Bugfixes
- Server: ファイルのアップロードに失敗することがある問題を修正 @acid-chicken
- Client: リアクションピッカーがアプリ内ウィンドウの後ろに表示されてしまう問題を修正 @syuilo
- Client: ユーザー情報の取得の再試行を修正 @xianonn
- Client: MFMチートシートの挙動を修正 @syuilo
- Client: 「インスタンスからのお知らせを受け取る」の設定を変更できない問題を修正 @syuilo

## 12.117.0 (2022/07/18)

### Improvements
- Client: ウィンドウを最大化できるように @syuilo
- Client: Shiftキーを押した状態でリンクをクリックするとアプリ内ウィンドウで開くように @syuilo
- Client: デッキを使用している際、Ctrlキーを押した状態でリンクをクリックするとページ遷移を強制できるように @syuilo
- Client: UIのブラッシュアップ @syuilo

## 12.116.1 (2022/07/17)

### Bugfixes
- Client: デッキUI時に ページで表示 ボタンが機能しない問題を修正 @syuilo
- Error During Migration Run to 12.111.x

## 12.116.0 (2022/07/16)

### Improvements
- Client: registry editor @syuilo
- Client: UIのブラッシュアップ @syuilo

### Bugfixes
- Error During Migration Run to 12.111.x
- Server: TypeError: Cannot convert undefined or null to object @syuilo

## 12.115.0 (2022/07/16)

### Improvements
- Client: Deckのプロファイル切り替えを簡単に @syuilo
- Client: UIのブラッシュアップ @syuilo

## 12.114.0 (2022/07/15)

### Improvements
- RSSティッカーで表示順序をシャッフルできるように @syuilo

### Bugfixes
- クライアントが起動しなくなることがある問題を修正 @syuilo

## 12.113.0 (2022/07/13)

### Improvements
- Support <plain> syntax for MFM

### Bugfixes
- Server: Fix crash at startup if TensorFlow is not supported @mei23
- Client: URLエンコードされたルーティングを修正

## 12.112.3 (2022/07/09)

### Improvements
- Make active email validation configurable

### Bugfixes
- Server: Fix Attempts to update all notifications @mei23

## 12.112.2 (2022/07/08)

### Bugfixes
- Fix Docker doesn't work @mei23
  Still not working on arm64 environment. (See 12.112.0)

## 12.112.1 (2022/07/07)
same as 12.112.0

## 12.112.0 (2022/07/07)

### Known issues
- 現在arm64環境ではインストールに失敗します。これは次のバージョンで修正される予定です。

### Changes
- ハイライトがみつけるに統合されました
- カスタム絵文字ページはインスタンス情報ページに統合されました
- 連合ページはインスタンス情報ページに統合されました
- メンション一覧ページは通知一覧ページに統合されました
- ダイレクト投稿一覧ページは通知一覧ページに統合されました
- メニューからアンテナタイムラインを表示する方法は廃止され、タイムライン上部のアイコンからアクセスするようになりました
- メニューからリストタイムラインを表示する方法は廃止され、タイムライン上部のアイコンからアクセスするようになりました

### Improvements
- Server: Allow GET method for some endpoints @syuilo
- Server: Auto NSFW detection @syuilo
- Server: Add rate limit to i/notifications @tamaina
- Client: Improve control panel @syuilo
- Client: Show warning in control panel when there is an unresolved abuse report @syuilo
- Client: Statusbars @syuilo
- Client: Add instance-cloud widget @syuilo
- Client: Add rss-ticker widget @syuilo
- Client: Removing entries from a clip @futchitwo
- Client: Poll highlights in explore page @syuilo
- Client: Improve deck UI @syuilo
- Client: Word mute also checks content warnings @Johann150
- Client: メニューからページをリロードできるように @syuilo
- Client: Improve emoji picker performance @syuilo
- Client: For notes with specified visibility, show recipients when hovering over visibility symbol. @Johann150
- Client: Make widgets available again on a tablet @syuilo
- ユーザーにモデレーションメモを残せる機能 @syuilo
- Make possible to delete an account by admin @syuilo
- Improve player detection in URL preview @mei23
- Add Badge Image to Push Notification #8012 @tamaina
- Server: Improve performance
- Server: Supports IPv6 on Redis transport. @mei23
  IPv4/IPv6 is used by default. You can tune this behavior via `redis.family`.
- Server: Add possibility to log IP addresses of users @syuilo
- Add additional drive capacity change support @CyberRex0

### Bugfixes
- Server: Fix GenerateVideoThumbnail failed @mei23
- Server: Ensure temp directory cleanup @Johann150
- favicons of federated instances not showing @syuilo
- Admin: The checkbox for blocking an instance works again @Johann150
- Client: Prevent access to user pages when not logged in @pixeldesu @Johann150
- Client: Disable some hotkeys (e.g. for creating a post) for not logged in users @pixeldesu
- Client: Ask users that are not logged in to log in when trying to vote in a poll @Johann150
- Instance mutes also apply in antennas etc. @Johann150

## 12.111.1 (2022/06/13)

### Bugfixes
- some fixes of multiple notification read @tamaina
- some GenerateVideoThumbnail failed @Johann150
- Client: デッキでウィジェットの情報が保存されない問題を修正 @syuilo
- Client: ギャラリーの投稿を開こうとすると編集画面が表示される @futchitwo

## 12.111.0 (2022/06/11)
### Note
- Node.js 16.15.0 or later is required

### Improvements
- Supports Unicode Emoji 14.0 @mei23
- プッシュ通知を複数アカウント対応に #7667 @tamaina
- プッシュ通知にクリックやactionを設定 #7667 @tamaina
- ドライブに画像ファイルをアップロードするときオリジナル画像を破棄してwebpublicのみ保持するオプション @tamaina
- Server: always remove completed tasks of job queue @Johann150
- Client: アバターの設定で画像をクロップできるように @syuilo
- Client: make emoji stand out more on reaction button @Johann150
- Client: display URL of QR code for TOTP registration @tamaina
- Client: render quote renote CWs as MFM @pixeldesu
- API: notifications/readは配列でも受け付けるように #7667 @tamaina
- API: ユーザー検索で、クエリがusernameの条件を満たす場合はusernameもLIKE検索するように @tamaina
- MFM: Allow speed changes in all animated MFMs @Johann150
- The theme color is now better validated. @Johann150
  Your own theme color may be unset if it was in an invalid format.
  Admins should check their instance settings if in doubt.
- Perform port diagnosis at startup only when Listen fails @mei23
- Rate limiting is now also usable for non-authenticated users. @Johann150 @mei23
  Admins should make sure the reverse proxy sets the `X-Forwarded-For` header to the original address.

### Bugfixes
- Server: keep file order of note attachement @Johann150
- Server: fix missing foreign key for reports leading to reports page being unusable @Johann150
- Server: fix internal in-memory caching @Johann150
- Server: prevent crash when processing certain PNGs @syuilo
- Server: Fix unable to generate video thumbnails @mei23
- Server: Fix `Cannot find module` issue @mei23
- Federation: Add rel attribute to host-meta @mei23
- Federation: add id for activitypub follows @Johann150
- Federation: use `source` instead of `_misskey_content` @Johann150
- Federation: ensure resolver does not fetch local resources via HTTP(S) @Johann150
- Federation: correctly render empty note text @Johann150
- Federation: Fix quote renotes containing no text being federated correctly @Johann150
- Federation: remove duplicate br tag/newline @Johann150
- Federation: add missing authorization checks @Johann150
- Client: fix profile picture height in mentions @tamaina
- Client: fix abuse reports page to be able to show all reports @Johann150
- Client: fix settings page @tamaina
- Client: fix profile tabs @futchitwo
- Client: fix popout URL @futchitwo
- Client: correctly handle MiAuth URLs with query string @sn0w
- Client: ノート詳細ページの新しいノートを表示する機能の動作が正しくなるように修正する @xianonn
- MFM: more animated functions support `speed` parameter @futchitwo
- MFM: limit large MFM @Johann150

## 12.110.1 (2022/04/23)

### Bugfixes
- Fix GOP rendering @syuilo
- Improve performance of antenna, clip, and list @xianonn

## 12.110.0 (2022/04/11)

### Improvements
- Improve webhook @syuilo
- Client: Show loading icon on splash screen @syuilo

### Bugfixes
- API: parameter validation of users/show was wrong
- Federation: リモートインスタンスへのダイレクト投稿が届かない問題を修正 @syuilo

## 12.109.2 (2022/04/03)

### Bugfixes
- API: admin/update-meta was not working @syuilo
- Client: テーマを切り替えたり読み込んだりするとmeta[name="theme-color"]のcontentがundefinedになる問題を修正 @tamaina

## 12.109.1 (2022/04/02)

### Bugfixes
- API: Renoteが行えない問題を修正

## 12.109.0 (2022/04/02)

### Improvements
- Webhooks @syuilo
- Bull Dashboardを組み込み、ジョブキューの確認や操作を行えるように @syuilo
  - Bull Dashboardを開くには、最初だけ一旦ログアウトしてから再度管理者権限を持つアカウントでログインする必要があります
- Check that installed Node.js version fulfills version requirement @ThatOneCalculator
- Server: overall performance improvements @syuilo
- Federation: avoid duplicate activity delivery @Johann150
- Federation: limit federation of reactions on direct notes @Johann150
- Client: タッチパッド・タッチスクリーンでのデッキの操作性を向上 @tamaina

### Bugfixes
- email address validation was not working @ybw2016v
- API: fix endpoint endpoint @Johann150
- API: fix admin/meta endpoint @syuilo
- API: improved validation and documentation for endpoints that accept different variants of input @Johann150
- API: `notes/create`: The `mediaIds` property is now deprecated. @Johann150
  - Use `fileIds` instead, it has the same behaviour.
- Client: URIエンコーディングが異常でdecodeURIComponentが失敗するとURLが表示できなくなる問題を修正 @tamaina

## 12.108.1 (2022/03/12)

### Bugfixes
- リレーが動作しない問題を修正 @xianonn
- ulidを使用していると動作しない問題を修正 @syuilo
- 外部からOGPが正しく取得できない問題を修正 @syuilo
- instance can not get the files from other instance when there are items in allowedPrivateNetworks in .config/default.yml @ybw2016v

## 12.108.0 (2022/03/09)

### NOTE
このバージョンからNode v16.14.0以降が必要です

### Changes
- ノートの最大文字数を設定できる機能が廃止され、デフォルトで一律3000文字になりました @syuilo
- Misskey can no longer terminate HTTPS connections. @Johann150
  - If you did not use a reverse proxy (e.g. nginx) before, you will probably need to adjust
    your configuration file and set up a reverse proxy. The `https` configuration key is no
    longer recognized!

### Improvements
- インスタンスデフォルトテーマを設定できるように @syuilo
- ミュートに期限を設定できるように @syuilo
- アンケートが終了したときに通知が作成されるように @syuilo
- プロフィールの追加情報を最大16まで保存できるように @syuilo
- 連合チャートにPub&Subを追加 @syuilo
- 連合チャートにActiveを追加 @syuilo
- デフォルトで10秒以上時間がかかるデータベースへのクエリは中断されるように @syuilo
	- 設定ファイルの`db.extra`に`statement_timeout`を設定することでタイムアウト時間を変更できます
- Client: スプラッシュスクリーンにインスタンスのアイコンを表示するように @syuilo

### Bugfixes
- Client: リアクションピッカーの高さが低くなったまま戻らないことがあるのを修正 @syuilo
- Client: ユーザー名オートコンプリートが正しく動作しない問題を修正 @syuilo
- Client: タッチ操作だとウィジェットの編集がしにくいのを修正 @xianonn
- Client: register_note_view_interruptor()が動かないのを修正 @syuilo
- Client: iPhone X以降(?)でページの内容が全て表示しきれないのを修正 @tamaina
- Client: fix image caption on mobile @nullobsi

## 12.107.0 (2022/02/12)

### Improvements
- クライアント: テーマを追加 @syuilo

### Bugfixes
- API: stats APIで内部エラーが発生する問題を修正 @syuilo
- クライアント: ソフトミュートですべてがマッチしてしまう場合があるのを修正 @tamaina
- クライアント: デバイスのスクリーンのセーフエリアを考慮するように @syuilo
- クライアント: 一部環境でサイドバーの投稿ボタンが表示されない問題を修正 @syuilo

## 12.106.3 (2022/02/11)

### Improvements
- クライアント: スマートフォンでの余白を調整 @syuilo

### Bugfixes
- クライアント: ノートの詳細が表示されない問題を修正 @syuilo

## 12.106.2 (2022/02/11)

### Bugfixes
- クライアント: 削除したノートがタイムラインから自動で消えない問題を修正 @syuilo
- クライアント: リアクション数が正しくないことがある問題を修正 @syuilo
- 一部環境でマイグレーションが動作しない問題を修正 @syuilo

## 12.106.1 (2022/02/11)

### Bugfixes
- クライアント: ワードミュートが保存できない問題を修正 @syuilo

## 12.106.0 (2022/02/11)

### Improvements
- Improve federation chart @syuilo
- クライアント: リアクションピッカーのサイズを設定できるように @syuilo
- クライアント: リアクションピッカーの幅、高さ制限を緩和 @syuilo
- Docker: Update to Node v16.13.2 @mei23
- Update dependencies

### Bugfixes
- validate regular expressions in word mutes @Johann150

## 12.105.0 (2022/02/09)

### Improvements
- インスタンスのテーマカラーを設定できるように @syuilo

### Bugfixes
- 一部環境でマイグレーションが失敗する問題を修正 @syuilo

## 12.104.0 (2022/02/09)

### Note
ビルドする前に`yarn clean`を実行してください。

このリリースはマイグレーションの規模が大きいため、インスタンスによってはマイグレーションに時間がかかる可能性があります。
マイグレーションが終わらない場合は、チャートの情報はリセットされてしまいますが`__chart__`で始まるテーブルの**レコード**を全て削除(テーブル自体は消さないでください)してから再度試す方法もあります。

### Improvements
- チャートエンジンの強化 @syuilo
	- テーブルサイズの削減
	- notes/instance/perUserNotesチャートに添付ファイル付きノートの数を追加
	- activeUsersチャートに新しい項目を追加
	- federationチャートに新しい項目を追加
	- apRequestチャートを追加
	- networkチャート廃止
- クライアント: 自インスタンス情報ページでチャートを見れるように @syuilo
- クライアント: デバイスの種類を手動指定できるように @syuilo
- クライアント: UIのアイコンを更新 @syuilo
- クライアント: UIのアイコンをセルフホスティングするように @syuilo
- NodeInfo のユーザー数と投稿数の内容を見直す @xianonn

### Bugfixes
- Client: タイムライン種別を切り替えると「新しいノートがあります」の表示が残留してしまうのを修正 @tamaina
- Client: UIのサイズがおかしくなる問題の修正 @tamaina
- Client: Setting instance information of notes to always show breaks the timeline @Johann150
- Client: 環境に依っては返信する際のカーソル位置が正しくない問題を修正 @syuilo
- Client: コントロールパネルのユーザー、ファイルにて、インスタンスの表示範囲切り替えが機能しない問題を修正 @syuilo
- Client: アップデートお知らせダイアログが出ないのを修正 @syuilo
- Client: Follows/Followers Visibility changes won't be saved unless clicking on an other checkbox @Johann150
- API: Fix API cast @mei23
- add instance favicon where it's missing @solfisher
- チャートの定期resyncが動作していない問題を修正 @syuilo

## 12.103.1 (2022/02/02)

### Bugfixes
- クライアント: ツールチップの表示位置が正しくない問題を修正

## 12.103.0 (2022/02/02)

### Improvements
- クライアント: 連合インスタンスページからインスタンス情報再取得を行えるように

### Bugfixes
- クライアント: 投稿のNSFW画像を表示したあとにリアクションが更新されると画像が非表示になる問題を修正
- クライアント: 「クリップ」ページが開かない問題を修正
- クライアント: トレンドウィジェットが動作しないのを修正
- クライアント: フェデレーションウィジェットが動作しないのを修正
- クライアント: リアクション設定で絵文字ピッカーが開かないのを修正
- クライアント: DMページでメンションが含まれる問題を修正
- クライアント: 投稿フォームのハッシュタグ保持フィールドが動作しない問題を修正
- クライアント: サイドビューが動かないのを修正
- クライアント: ensure that specified users does not get duplicates
- Add `img-src` and `media-src` directives to `Content-Security-Policy` for
  files and media proxy

## 12.102.1 (2022/01/27)
### Bugfixes
- チャットが表示できない問題を修正

## 12.102.0 (2022/01/27)

### NOTE
アップデート後、一部カスタム絵文字が表示できなくなる場合があります。その場合、一旦絵文字管理ページから絵文字を一括エクスポートし、再度コントロールパネルから一括インポートすると直ります。
⚠ 12.102.0以前にエクスポートされたzipとは互換性がありません。アップデートしてからエクスポートを行なってください。

### Changes
- Room機能が削除されました
  - 後日別リポジトリとして復活予定です
- リバーシ機能が削除されました
  - 後日別リポジトリとして復活予定です
- Chat UIが削除されました
- ノートに添付できるファイルの数が16に増えました
- カスタム絵文字にSVGを指定した場合、PNGに変換されて表示されるようになりました

### Improvements
- カスタム絵文字一括編集機能
- カスタム絵文字一括インポート
- 投稿フォームで一時的に投稿するアカウントを切り替えられるように
- Unifying Misskey-specific IRIs in JSON-LD `@context`
- クライアントのパフォーマンス向上
- セキュリティの向上

### Bugfixes
- アップロードエラー時の処理を修正

## 12.101.1 (2021/12/29)

### Bugfixes
- SVG絵文字が表示できないのを修正
- エクスポートした絵文字の拡張子がfalseになることがあるのを修正

## 12.101.0 (2021/12/29)

### Improvements
- クライアント: ノートプレビューの精度を改善
- クライアント: MFM sparkleエフェクトの改善
- クライアント: デザインの調整
- セキュリティの向上

### Bugfixes
- クライアント: 一部のコンポーネントが裏に隠れるのを修正
- fix html blockquote conversion

## 12.100.2 (2021/12/18)

### Bugfixes
- クライアント: Deckカラムの増減がページをリロードするまで正しく反映されない問題を修正
- クライアント: 一部のコンポーネントが裏に隠れるのを修正
- クライアント: カスタム絵文字一覧ページの負荷が高いのを修正

## 12.100.1 (2021/12/17)

### Bugfixes
- クライアント: デザインの調整

## 12.100.0 (2021/12/17)

### Improvements
- クライアント: モバイルでの各種メニュー、リアクションピッカーの表示を改善

### Bugfixes
- クライアント: 一部のコンポーネントが裏に隠れるのを修正

## 12.99.3 (2021/12/14)
### Bugfixes
- クライアント: オートコンプリートがダイアログの裏に隠れる問題を修正

## 12.99.2 (2021/12/14)

## 12.99.1 (2021/12/14)

## 12.99.0 (2021/12/14)

### Improvements
- Added a user-level instance mute in user settings
- フォローエクスポートでミュートしているユーザーを含めないオプションを追加
- フォローエクスポートで使われていないアカウントを含めないオプションを追加
- カスタム絵文字エクスポート機能
- チャートのパフォーマンスの改善
- グループから抜けられるように

### Bugfixes
- クライアント: タッチ機能付きディスプレイを使っていてマウス操作をしている場合に一部機能が動作しない問題を修正
- クライアント: クリップの設定を編集できない問題を修正
- クライアント: メニューなどがウィンドウの裏に隠れる問題を修正

## 12.98.0 (2021/12/03)

### Improvements
- API: /antennas/notes API で日付による絞り込みができるように
- クライアント: アンケートに投票する際に確認ダイアログを出すように
- クライアント: Renoteなノート詳細ページから元のノートページに遷移できるように
- クライアント: 画像ポップアップでクリックで閉じられるように
- クライアント: デザインの調整
- フォロワーを解除できる機能

### Bugfixes
- クライアント: LTLやGTLが無効になっている場合でもUI上にタブが表示される問題を修正
- クライアント: ログインにおいてパスワードが誤っている際のエラーメッセージが正しく表示されない問題を修正
- クライアント: リアクションツールチップ、Renoteツールチップのユーザーの並び順を修正
- クライアント: サウンドのマスターボリュームが正しく保存されない問題を修正
- クライアント: 一部環境において通知が表示されると操作不能になる問題を修正
- クライアント: モバイルでタップしたときにツールチップが表示される問題を修正
- クライアント: リモートインスタンスのノートに返信するとき、対象のノートにそのリモートインスタンス内のユーザーへのメンションが含まれていると、返信テキスト内にローカルユーザーへのメンションとして引き継がれてしまう場合がある問題を修正
- クライアント: 画像ビューワーで全体表示した時に上側の一部しか表示されない画像がある問題を修正
- API: ユーザーを取得時に条件によっては内部エラーになる問題を修正

### Changes
- クライアント: ノートにモデレーターバッジを表示するのを廃止

## 12.97.0 (2021/11/19)

### Improvements
- クライアント: 返信先やRenoteに対しても自動折りたたみされるように
- クライアント: 長いスレッドの表示を改善
- クライアント: 翻訳にもMFMを適用し、元の文章の改行などを保持するように
- クライアント: アカウント削除に確認ダイアログを出すように

### Bugfixes
- クライアント: ユーザー検索の「全て」が動作しない問題を修正
- クライアント: リアクション一覧、Renote一覧ツールチップのスタイルを修正

## 12.96.1 (2021/11/13)
### Improvements
- npm scriptの互換性を向上

## 12.96.0 (2021/11/13)

### Improvements
- フォロー/フォロワーを非公開にできるように
- インスタンスプロフィールレンダリング ready
- 通知のリアクションアイコンをホバーで拡大できるように
- RenoteボタンをホバーでRenoteしたユーザー一覧を表示するように
- 返信の際にメンションを含めるように
- 通報があったときに管理者へEメールで通知されるように
- メールアドレスのバリデーションを強化

### Bugfixes
- アカウント削除処理があると高負荷になる問題を修正
- クライアント: 長いメニューが画面からはみ出す問題を修正
- クライアント: コントロールパネルのジョブキューに個々のジョブが表示されないのを修正
- クライアント: fix missing i18n string
- fix html conversion issue with code blocks

### Changes
- ノートにモバイルからの投稿か否かの情報を含めないように

## 12.95.0 (2021/10/31)

### Improvements
- スレッドミュート機能

### Bugfixes
- リレー向けのActivityが一部実装で除外されてしまうことがあるのを修正
- 削除したノートやユーザーがリモートから参照されると復活することがあるのを修正
- クライアント: ページ編集時のドロップダウンメニューなどが動作しない問題を修正
- クライアント: コントロールパネルのカスタム絵文字タブが切り替わらないように見える問題を修正
- API: ユーザー情報の hasUnreadChannel が常に false になっている問題を修正

## 12.94.1 (2021/10/25)

### Improvements

### Bugfixes
- クライアント: ユーザーページのナビゲーションが失敗する問題を修正

## 12.94.0 (2021/10/25)

### Improvements
- クライアント: 画像ビューアを強化
- クライアント: メンションにユーザーのアバターを表示するように
- クライアント: デザインの調整
- クライアント: twemojiをセルフホスティングするように

### Bugfixes
- クライアント: CWで画像が隠されたとき、画像の高さがおかしいことになる問題を修正

### NOTE
- このバージョンから、iOS 15未満のサポートがされなくなります。対象のバージョンをお使いの方は、iOSのバージョンアップを行ってください。

## 12.93.2 (2021/10/23)

### Bugfixes
- クライアント: ウィジェットを追加できない問題を修正

## 12.93.1 (2021/10/23)

### Bugfixes
- クライアント: 通知上でローカルのリアクションが表示されないのを修正

## 12.93.0 (2021/10/23)

### Improvements
- クライアント: コントロールパネルのパフォーマンスを改善
- クライアント: 自分のリアクション一覧を見れるように
	- 設定により、リアクション一覧を全員に公開することも可能
- クライアント: ユーザー検索の精度を強化
- クライアント: 新しいライトテーマを追加
- クライアント: 新しいダークテーマを追加
- API: ユーザーのリアクション一覧を取得する users/reactions を追加
- API: users/search および users/search-by-username-and-host を強化
- ミュート及びブロックのインポートを行えるように
- クライアント: /share のクエリでリプライやファイル等の情報を渡せるように
- チャートのsyncを毎日0時に自動で行うように

### Bugfixes
- クライアント: テーマの管理が行えない問題を修正
- API: アプリケーション通知が取得できない問題を修正
- クライアント: リモートノートで意図せずローカルカスタム絵文字が使われてしまうことがあるのを修正
- ActivityPub: not reacted な Undo.Like がinboxに滞留するのを修正

### Changes
- 連合の考慮に問題があることなどが分かったため、モデレーターをブロックできない仕様を廃止しました
- データベースにログを保存しないようになりました
	- ログを永続化したい場合はsyslogを利用してください

## 12.92.0 (2021/10/16)

### Improvements
- アカウント登録にメールアドレスの設定を必須にするオプション
- クライアント: 全体的なUIのブラッシュアップ
- クライアント: MFM関数構文のサジェストを実装
- クライアント: ノート本文を投稿フォーム内でプレビューできるように
- クライアント: 未読の通知のみ表示する機能
- クライアント: 通知ページで通知の種類によるフィルタ
- クライアント: アニメーションを減らす設定の適用範囲を拡充
- クライアント: 新しいダークテーマを追加
- クライアント: テーマコンパイラに hue と saturate 関数を追加
- ActivityPub: HTML -> MFMの変換を強化
- API: グループから抜ける users/groups/leave エンドポイントを実装
- API: i/notifications に unreadOnly オプションを追加
- API: ap系のエンドポイントをログイン必須化+レートリミット追加
- MFM: Add tag syntaxes of bold <b></b> and strikethrough <s></s>

### Bugfixes
- Fix createDeleteAccountJob
- admin inbox queue does not show individual jobs
- クライアント: ヘッダーのタブが折り返される問題を修正
- クライアント: ヘッダーにタブが表示されている状態でタイトルをクリックしたときにタブ選択が表示されるのを修正
- クライアント: ユーザーページのタブが機能していない問題を修正
- クライアント: ピン留めユーザーの設定項目がない問題を修正
- クライアント: Deck UIにおいて、重ねたカラムの片方を畳んだ状態で右に出すと表示が壊れる問題を修正
- API: 管理者およびモデレーターをブロックできてしまう問題を修正
- MFM: Mentions in the link label are parsed as text
- MFM: Add a property to the URL node indicating whether it was enclosed in <>
- MFM: Disallows < and > in hashtags

### Changes
- 保守性やユーザビリティの観点から、Misskeyのコマンドラインオプションが削除されました。
	- 必要であれば、代わりに環境変数で設定することができます
- MFM: パフォーマンス、保守性、構文誤認識抑制の観点から、旧関数構文のサポートが削除されました。
	- 旧構文(`[foo bar]`)を使用せず、現行の構文(`$[foo bar]`)を使用してください。

## 12.91.0 (2021/09/22)

### Improvements
- ActivityPub: リモートユーザーのDeleteアクティビティに対応
- ActivityPub: add resolver check for blocked instance
- ActivityPub: deliverキューのメモリ使用量を削減
- API: 管理者用アカウント削除APIを実装(/admin/accounts/delete)
	- リモートユーザーの削除も可能に
- アカウントが凍結された場合に、凍結された旨を表示してからログアウトするように
- 凍結されたアカウントにログインしようとしたときに、凍結されている旨を表示するように
- リスト、アンテナタイムラインを個別ページとして分割
- UIの改善
- MFMにsparklesエフェクトを追加
- 非ログイン自は更新ダイアログを出さないように
- クライアント起動時、アップデートが利用可能な場合エラー表示およびダイアログ表示しないように

### Bugfixes
- アカウントデータのエクスポート/インポート処理ができない問題を修正
- アンテナの既読が付かない問題を修正
- popupで設定ページを表示すると、アカウントの削除ページにアクセスすることができない問題を修正
- "問題が発生しました"ウィンドウを開くと☓ボタンがなくて閉じれない問題を修正

## 12.90.1 (2021/09/05)

### Bugfixes
- Dockerfileを修正
- ノート翻訳時に公開範囲が考慮されていない問題を修正

## 12.90.0 (2021/09/04)

### Improvements
- 藍モード、および藍ウィジェット
	- クライアントに藍ちゃんを召喚することができるようになりました。
- URLからのアップロード, APの添付ファイル, 外部ファイルのプロキシ等では、Privateアドレス等へのリクエストは拒否されるようになりました。
	- developmentで動作している場合は、この制限は適用されません。
	- Proxy使用時には、この制限は適用されません。
		Proxy使用時に同等の制限を行いたい場合は、Proxy側で設定を行う必要があります。
	- `default.yml`にて`allowedPrivateNetworks`にCIDRを追加することにより、宛先ネットワークを指定してこの制限から除外することが出来ます。
- アップロード, ダウンロード出来るファイルサイズにハードリミットが適用されるようになりました。(約250MB)
	- `default.yml`にて`maxFileSize`を変更することにより、制限値を変更することが出来ます。

### Bugfixes
- 管理者が最初にサインアップするページでログインされないのを修正
- CWを維持する設定を復活
- クライアントの表示を修正

## 12.89.2 (2021/08/24)

### Bugfixes
- カスタムCSSを有効にしているとエラーになる問題を修正

## 12.89.1 (2021/08/24)

### Improvements
- クライアントのデザインの調整

### Bugfixes
- 翻訳でDeepLのProアカウントに対応していない問題を修正
- インスタンス設定でDeepLのAuth Keyが空で表示される問題を修正
- セキュリティの向上

## 12.89.0 (2021/08/21)

### Improvements
- アカウント削除の安定性を向上
- 絵文字オートコンプリートの挙動を改修
- localStorageのaccountsはindexedDBで保持するように
- ActivityPub: ジョブキューの試行タイミングを調整 (#7635)
- API: sw/unregisterを追加
- ワードミュートのドキュメントを追加
- クライアントのデザインの調整
- 依存関係の更新

### Bugfixes
- チャンネルを作成しているとアカウントを削除できないのを修正
- ノートの「削除して編集」をするとアンケートの選択肢が[object Object]になる問題を修正

## 12.88.0 (2021/08/17)

### Features
- ノートの翻訳機能を追加
  - 有効にするには、サーバー管理者がDeepLの無料アカウントを登録し、取得した認証キーを「インスタンス設定 > その他 > DeepL Auth Key」に設定する必要があります。
- Misskey更新時にダイアログを表示するように
- ジョブキューウィジェットに警報音を鳴らす設定を追加

### Improvements
- ブロックの挙動を改修
	- ブロックされたユーザーがブロックしたユーザーに対してアクション出来ないようになりました。詳細はドキュメントをご確認ください。
- UIデザインの調整
- データベースのインデックスを最適化
- Proxy使用時にKeep-Aliveをサポート
- DNSキャッシュでネガティブキャッシュをサポート
- 依存関係の更新

### Bugfixes
- タッチ操作でウィンドウを閉じることができない問題を修正
- Renoteされた時刻が投稿された時刻のように表示される問題を修正
- コントロールパネルでファイルを削除した際の表示を修正
- ActivityPub: 長いユーザーの名前や自己紹介の対応

## 12.87.0 (2021/08/12)

### Improvements
- 絵文字オートコンプリートで一文字目は最近使った絵文字をサジェストするように
- 絵文字オートコンプリートのパフォーマンスを改善
- about-misskeyページにドキュメントへのリンクを追加
- Docker: Node.jsを16.6.2に
- 依存関係の更新
- 翻訳の更新

### Bugfixes
- Misskey更新時、テーマキャッシュの影響でスタイルがおかしくなる問題を修正

## 12.86.0 (2021/08/11)

### Improvements
- ドキュメントの更新
	- ドキュメントにchangelogを追加
- ぼかし効果のオプションを追加
- Vueを3.2.1に更新
- UIの調整

### Bugfixes
- ハッシュタグ入力が空のときに#が付くのを修正
- フォローリクエストのEメール通知を修正
