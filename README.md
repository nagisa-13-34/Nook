# Nook

[日本語](#日本語) | [English](#english)

## 日本語

Nook は [Misskey](https://github.com/misskey-dev/misskey) をベースにした、分散型ソーシャルプラットフォームです。

Misskey / MFM / ActivityPub との互換性を重視しながら、Nook 独自の UI、安全性・ポリシーレイヤー、プライバシーを意識した初期設定、コミュニティ機能、より親しみやすい投稿体験を追加しています。

> [!IMPORTANT]
> Nook は Misskey から派生した独立プロジェクトで、現在も開発中です。公式の Misskey ディストリビューションではありません。

### Nook が追加するもの

#### Nook UI

- Nook 独自のデスクトップサイドバーとモバイルナビゲーション
- Home、Explore、Community、Chat、Notifications、Widgets、Settings、アカウントへの導線
- コンパクトモードを含むレスポンシブなデスクトップナビゲーション
- Nook 向けのラベル、アイコン、空状態、操作フロー

#### タイムラインとプロフィール

- Following タイムライン
- Discover タイムライン
- Media タイムライン
- Posts / Media / Videos / Works のプロフィールタブ
- ブックマーク UI
- 新規ユーザーでは Likes / reactions をデフォルトで非公開

#### Community と Chat

- Community MVP
- `minors_only` / `mixed` / `adults_only` の Community 年齢モード
- Community 作成・参加・招待・承認・メンバー再有効化での年齢モード適用
- Community message、voice、bot、restricted audience などへの成人・未成年間コミュニケーション境界の適用
- Chat のポリシー適用
- Room chat のポリシー適用
- Follow のポリシー適用
- 相互フォローや年齢・ポリシーを考慮したアクセス判定

#### 安全性・ポリシーレイヤー

Nook は、投稿・フォロー・チャットなどの操作に対してポリシーシステムを追加しています。

ActivityPub の基礎仕様を変更せず、ポリシー判定を明示的かつテスト可能に保つ設計を重視しています。

現在のポリシー関連の実装には、次のようなものがあります。

- アカウント状態 / 年齢グループ / 国を考慮したポリシー選択
- 保護対象ユーザーとのコミュニケーション判定
- Community の年齢モードと成人・未成年間のコミュニケーション境界
- 年齢情報が不明な remote user に対する保守的な扱い
- 参加人数に比例した DB クエリ増加を避ける room policy の一括評価
- 重要なポリシー境界に対する unit / endpoint テスト

### Hybrid Markdown + MFM

Nook では、既存 MFM を置き換えるのではなく、MFM と共存する小さな Markdown 風入力レイヤーも開発しています。

例:

````text
**bold**
*italic*
~~strikethrough~~
`inline code`

> quote

[OpenAI](https://openai.com)

- item one
- item two

# Heading

```js
const hello = "world";
```

Hello @user #hashtag :custom_emoji:
$[shake MFM still works]
````

設計は Misskey の既存レンダリングパイプラインへできるだけ寄せています。

```text
Markdown風 preprocessor
        ↓
既存 mfm-js parser
        ↓
既存 MFM AST
        ↓
既存 renderer
```

CommonMark 完全準拠より、既存互換性を優先しています。

- `note.text` にはユーザーが入力した元の文字列を保存
- 既存投稿は従来の MFM 経路を維持
- remote note を Nook Markdown として再解釈しない
- MFM の Mention、Hashtag、Custom Emoji、Function、Quote、URL、Code を維持
- inline code / fenced code の内部では Markdown と MFM を展開しない
- ユーザー入力の raw HTML を新しいレンダリング経路として導入しない
- Markdown → HTML → DOM 再parse のような経路を作らない
- 大規模な Markdown 依存を追加しない

Hybrid Markdown + MFM は実験的な Nook 機能であり、互換性検証を進めながら仕様が変わる可能性があります。

### 互換性の方針

Nook は、変更をできるだけ小さく、必要なら戻しやすい形に保つことを重視しています。

特に次を意識しています。

- 既存の `note.text` 保存形式を維持
- 可能な限り既存 note のデータ構造を維持
- Nook UI のためだけに ActivityPub payload を変更しない
- remote note は従来の解析挙動を維持
- 既存 MFM を主要な互換フォーマットとして維持
- セキュリティに関わる表示は既存の AST / component レンダリング経路を使用

### リポジトリ構成

このリポジトリは upstream Misskey の monorepo 構成を引き継いでいます。

| Path | 内容 |
| --- | --- |
| `packages/backend` | API、データベース、Federation、ポリシー、note 作成 |
| `packages/frontend` | Nook / Misskey Web クライアント |
| `packages/misskey-js` | JavaScript / TypeScript クライアント型と共有 SDK コード |
| `packages/i18n` | ローカライズ基盤 |
| `packages/sw` | Service Worker |
| `locales` | 翻訳ソースファイル |

### 開発

Nook の開発環境は、現在 Misskey の構成を多く引き継いでいます。

#### 必要なもの

開発には少なくとも次の環境を想定しています。

- 現在の Misskey ベースが対応している Node.js
- pnpm（現在の `packageManager` は `pnpm@11.11.0`）
- PostgreSQL
- Redis
- FFmpeg

Meilisearch は基本開発では任意ですが、一部機能やテストで必要になる場合があります。

#### 依存関係のインストール

```sh
corepack enable
pnpm install
```

#### Docker Compose でローカルミドルウェアを起動

```sh
docker compose -f compose.local-db.yml up -d
```

その後、[CONTRIBUTING.md](./CONTRIBUTING.md) に従ってローカルインスタンスを設定してください。

#### 開発サーバー

```sh
pnpm dev
```

#### ビルド

```sh
pnpm build
```

#### テストと lint

```sh
pnpm test
pnpm lint
```

用途を絞ったコマンド例:

```sh
pnpm backend-unit-test
pnpm --filter backend typecheck
pnpm --filter frontend typecheck
pnpm --filter misskey-js typecheck
```

API schema を変更した場合、生成済みファイルを手作業で編集せず、リポジトリの generator を使って `misskey-js` を再生成してください。

```sh
pnpm --filter misskey-js update-autogen-code
```

### Contributing

Nook は大規模な upstream project をベースとしているため、明確な理由がない限り、変更範囲を絞って互換性を維持することを推奨します。

大きな変更を行う前に、次を確認してください。

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- リポジトリ固有の agent / 開発ルール: [AGENTS.md](./AGENTS.md)

Nook 固有の変更では、次を優先してください。

- 大規模な書き換えより小さな diff
- policy / parser / compatibility 境界のテスト
- 並行実装より既存 Misskey component / parser の再利用
- local / remote / legacy data の明示的な扱い
- 利便性よりセキュリティと Federation 互換性

### Upstream

Nook は、オープンソースの分散型ソーシャルプラットフォーム [Misskey](https://github.com/misskey-dev/misskey) をベースにしています。

Backend、Frontend、Federation stack、MFM 実装、tooling、翻訳、開発基盤の多くは Misskey project とその contributors によるものです。

Nook 固有ではない挙動を調査するときは、対応する upstream Misskey の実装も確認すると役立ちます。

### ライセンス

Nook は upstream codebase と同じ **GNU Affero General Public License v3.0 (AGPL-3.0)** で配布されます。

全文は [LICENSE](./LICENSE) を確認してください。

---

## English

Nook is a federated social platform built on top of [Misskey](https://github.com/misskey-dev/misskey).

It keeps Misskey / MFM / ActivityPub compatibility as a priority while adding a Nook-specific UI, safety and policy layer, privacy-oriented defaults, community features, and a more familiar posting experience.

> [!IMPORTANT]
> Nook is an independent derivative of Misskey and is still under active development. It is not the official Misskey distribution.

### What Nook adds

#### Nook UI

- Nook desktop sidebar and mobile navigation
- Home, Explore, Community, Chat, Notifications, Widgets, Settings, and account navigation
- Responsive desktop navigation with compact mode
- Nook-oriented labels, icons, empty states, and interaction flows

#### Timelines and profiles

- Following timeline
- Discover timeline
- Media timeline
- Profile tabs for Posts, Media, Videos, and Works
- Bookmarks UI
- Likes / reactions private by default for newly created users

#### Community and Chat

- Community MVP
- Community age modes: `minors_only`, `mixed`, and `adults_only`
- Age-mode enforcement across Community creation, joining, invites, approvals, and member reactivation
- Adult/minor communication boundaries for Community messages, voice, bots, restricted audiences, and other member-facing write surfaces
- Chat policy enforcement
- Room chat policy enforcement
- Follow policy enforcement
- Mutual-follow and age/policy-aware access decisions

#### Safety and policy layer

Nook adds a policy system around actions such as posting, following, and chat.

The implementation is designed to keep policy decisions explicit and testable while avoiding changes to the underlying ActivityPub protocol.

Current policy work includes:

- account-state / age-group / country-aware policy selection
- protected-user communication checks
- Community age modes and adult/minor communication boundaries
- remote-user conservative handling when age information is unavailable
- batched room policy evaluation to avoid participant-scaled database queries
- unit and endpoint coverage for important policy boundaries

### Hybrid Markdown + MFM

Nook is also developing a small Markdown-like input layer that works together with existing MFM instead of replacing it.

Examples:

````text
**bold**
*italic*
~~strikethrough~~
`inline code`

> quote

[OpenAI](https://openai.com)

- item one
- item two

# Heading

```js
const hello = "world";
```

Hello @user #hashtag :custom_emoji:
$[shake MFM still works]
````

The design intentionally stays close to Misskey's existing rendering pipeline:

```text
Markdown-like preprocessor
        ↓
existing mfm-js parser
        ↓
existing MFM AST
        ↓
existing renderer
```

Compatibility rules are more important than full CommonMark compliance:

- `note.text` keeps the original user input
- existing notes remain on the legacy MFM path
- remote notes are not reinterpreted as Nook Markdown
- MFM mentions, hashtags, custom emoji, functions, quotes, URLs, and code remain supported
- inline and fenced code keep Markdown and MFM inactive inside the code
- raw user HTML is not introduced as a rendering path
- no Markdown-to-HTML-to-DOM reparse pipeline is used
- no large Markdown dependency is required

Hybrid Markdown + MFM is an experimental Nook feature and may evolve as compatibility testing continues.

### Compatibility principles

Nook tries to keep changes narrow and reversible.

In particular:

- existing `note.text` storage is preserved
- existing note data structures are kept compatible wherever possible
- ActivityPub payloads are not changed just to support Nook UI features
- remote notes keep their existing parsing behavior
- existing MFM remains the primary compatible formatting system
- security-sensitive rendering stays on the existing AST/component rendering path

### Repository structure

This repository follows the upstream Misskey monorepo layout.

| Path | Purpose |
| --- | --- |
| `packages/backend` | API, database, federation, policies, note creation |
| `packages/frontend` | Nook / Misskey web client |
| `packages/misskey-js` | JavaScript / TypeScript client types and shared SDK code |
| `packages/i18n` | localization infrastructure |
| `packages/sw` | service worker |
| `locales` | translation source files |

### Development

Nook currently inherits most of its development environment from Misskey.

#### Requirements

The development guide expects at least:

- Node.js supported by the current Misskey base
- pnpm (`packageManager` is currently `pnpm@11.11.0`)
- PostgreSQL
- Redis
- FFmpeg

Meilisearch is optional for basic development, but some features and tests may require it.

#### Install dependencies

```sh
corepack enable
pnpm install
```

#### Start local middleware with Docker Compose

```sh
docker compose -f compose.local-db.yml up -d
```

Then configure the local instance as described in [CONTRIBUTING.md](./CONTRIBUTING.md).

#### Development server

```sh
pnpm dev
```

#### Build

```sh
pnpm build
```

#### Tests and lint

```sh
pnpm test
pnpm lint
```

Useful focused commands include:

```sh
pnpm backend-unit-test
pnpm --filter backend typecheck
pnpm --filter frontend typecheck
pnpm --filter misskey-js typecheck
```

When the API schema changes, regenerate `misskey-js` using the repository's generator rather than editing generated files manually:

```sh
pnpm --filter misskey-js update-autogen-code
```

### Contributing

Nook is based on a large upstream project, so changes should stay focused and preserve compatibility unless there is a clear reason not to.

Before making larger changes, please read:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [AGENTS.md](./AGENTS.md) for repository-specific agent/development instructions

For Nook-specific work, prefer:

- small diffs over broad rewrites
- tests for policy, parser, and compatibility boundaries
- existing Misskey components and parsers over parallel implementations
- explicit handling of local / remote / legacy data
- security and federation compatibility over convenience

### Upstream

Nook is built from [Misskey](https://github.com/misskey-dev/misskey), an open-source federated social platform.

A large part of the backend, frontend, federation stack, MFM implementation, tooling, translations, and development infrastructure comes from the Misskey project and its contributors.

When debugging behavior that is not Nook-specific, checking the corresponding upstream Misskey implementation is often useful.

### License

Nook is distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**, following the license of the upstream codebase.

See [LICENSE](./LICENSE) for the full license text.