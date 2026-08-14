# Nook

Nook is a federated social platform built on top of [Misskey](https://github.com/misskey-dev/misskey).

It keeps Misskey / MFM / ActivityPub compatibility as a priority while adding a Nook-specific UI, safety and policy layer, privacy-oriented defaults, community features, and a more familiar posting experience.

> [!IMPORTANT]
> Nook is an independent derivative of Misskey and is still under active development. It is not the official Misskey distribution.

## What Nook adds

### Nook UI

- Nook desktop sidebar and mobile navigation
- Home, Explore, Community, Chat, Notifications, Widgets, Settings, and account navigation
- Responsive desktop navigation with compact mode
- Nook-oriented labels, icons, empty states, and interaction flows

### Timelines and profiles

- Following timeline
- Discover timeline
- Media timeline
- Profile tabs for Posts, Media, Videos, and Works
- Bookmarks UI
- Likes / reactions private by default for newly created users

### Community and Chat

- Community MVP
- Chat policy enforcement
- Room chat policy enforcement
- Follow policy enforcement
- Mutual-follow and age/policy-aware access decisions

### Safety and policy layer

Nook adds a policy system around actions such as posting, following, and chat.

The implementation is designed to keep policy decisions explicit and testable while avoiding changes to the underlying ActivityPub protocol.

Current policy work includes:

- account-state / age-group / country-aware policy selection
- protected-user communication checks
- remote-user conservative handling when age information is unavailable
- batched room policy evaluation to avoid participant-scaled database queries
- unit and endpoint coverage for important policy boundaries

## Hybrid Markdown + MFM

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

This feature is still being validated before it is merged into the main branch.

## Compatibility principles

Nook tries to keep changes narrow and reversible.

In particular:

- existing `note.text` storage is preserved
- existing note data structures are kept compatible wherever possible
- ActivityPub payloads are not changed just to support Nook UI features
- remote notes keep their existing parsing behavior
- existing MFM remains the primary compatible formatting system
- security-sensitive rendering stays on the existing AST/component rendering path

## Repository structure

This repository follows the upstream Misskey monorepo layout.

| Path | Purpose |
| --- | --- |
| `packages/backend` | API, database, federation, policies, note creation |
| `packages/frontend` | Nook / Misskey web client |
| `packages/misskey-js` | JavaScript / TypeScript client types and shared SDK code |
| `packages/i18n` | localization infrastructure |
| `packages/sw` | service worker |
| `locales` | translation source files |

## Development

Nook currently inherits most of its development environment from Misskey.

### Requirements

The development guide expects at least:

- Node.js supported by the current Misskey base
- pnpm (`packageManager` is currently `pnpm@11.11.0`)
- PostgreSQL
- Redis
- FFmpeg

Meilisearch is optional for basic development, but some features and tests may require it.

### Install dependencies

```sh
corepack enable
pnpm install
```

### Start local middleware with Docker Compose

```sh
docker compose -f compose.local-db.yml up -d
```

Then configure the local instance as described in [CONTRIBUTING.md](./CONTRIBUTING.md).

### Development server

```sh
pnpm dev
```

### Build

```sh
pnpm build
```

### Tests and lint

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

## Contributing

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

## Upstream

Nook is built from [Misskey](https://github.com/misskey-dev/misskey), an open-source federated social platform.

A large part of the backend, frontend, federation stack, MFM implementation, tooling, translations, and development infrastructure comes from the Misskey project and its contributors.

When debugging behavior that is not Nook-specific, checking the corresponding upstream Misskey implementation is often useful.

## License

Nook is distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**, following the license of the upstream codebase.

See [LICENSE](./LICENSE) for the full license text.
