from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new))


replace(
    'packages/backend/src/server/api/endpoints/notes/edit.ts',
    "\t\tconst activity = this.apRendererService.addContext(\n\t\t\tthis.apRendererService.renderUpdate(await this.apRendererService.renderNote(note, false), user),\n\t\t);",
    "\t\tconst renderedNote = await this.apRendererService.renderNote(note, false);\n\t\tconst update = this.apRendererService.renderUpdate(renderedNote, user);\n\t\tupdate.to = renderedNote.to;\n\t\tupdate.cc = renderedNote.cc;\n\t\tconst activity = this.apRendererService.addContext(update);",
)
