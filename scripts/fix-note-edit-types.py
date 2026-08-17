from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new))


replace(
    'packages/backend/src/core/WebhookTestService.ts',
    "\t\tcw: null,\n\t\tuserId: 'dummy-user-1',",
    "\t\tcw: null,\n\t\teditedAt: null,\n\t\teditHistory: [],\n\t\tuserId: 'dummy-user-1',",
)

replace(
    'packages/backend/test/unit/NoteCreateService.ts',
    "\t\t\tcw: null,\n\t\t\tuserId: 'some-user-id',",
    "\t\t\tcw: null,\n\t\t\teditedAt: null,\n\t\t\teditHistory: [],\n\t\t\tuserId: 'some-user-id',",
)

replace(
    'packages/backend/test/unit/misc/is-renote.ts',
    "\tcw: null,\n\tuserId: 'some-user-id',",
    "\tcw: null,\n\teditedAt: null,\n\teditHistory: [],\n\tuserId: 'some-user-id',",
)

replace(
    'packages/backend/src/server/api/endpoints/notes/edit.ts',
    "))).filter((mentioned): mentioned is MiUser => mentioned != null);",
    "))).filter((mentioned): mentioned is MiLocalUser | MiRemoteUser => mentioned != null);",
)
