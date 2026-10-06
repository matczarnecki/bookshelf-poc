# Design

## Context

`bookshelf add` already appends books to `data/books.json` through `src/reading-list.ts` and `node:util` `parseArgs` in `src/cli.ts`. The file is a JSON array of `{ id, title, addedAt, author? }`. A missing file reads as an empty list. Invalid JSON or a non-array fails with `ReadingListError` and is not written. See proposal.md for why listing is in scope. Behavior is specified in `specs/reading-list/spec.md`.

## Goals / Non-Goals

**Goals:**

- One read-only path from `bookshelf list` to stdout, with an optional author filter.
- Reuse the existing file read. Tests can point that path at a temporary file.
- A list command never creates or replaces the reading-list file.

**Non-Goals:**

- A new storage format, a database, a CLI framework, or a web UI.
- Validating each array element beyond the existing "value is an array" check.
- Changing `bookshelf add`.

## Decisions

### Add `list` beside `add` in the same CLI

`src/cli.ts` already owns argument parsing and the default path `data/books.json` in the current working directory. `list` is a second positional command in that file. The `bookshelf` npm script stays `tsx src/cli.ts`.

Parse the command first, then call `parseArgs` with only that command's options. `add` keeps `--title` and `--author`. `list` accepts only `--author`. An unknown command, an unexpected flag, or a missing flag value prints a short usage line to stderr and exits 1. Usage names both commands and the reading-list path.

Alternative: one `parseArgs` option set for every command. Rejected because `list --title` would be accepted and then ignored.

### Read through a list function; do not write

Add a function in `src/reading-list.ts` that takes the file path and an optional author filter and returns the books to print. It uses the existing read path. It does not call the write path, so a missing file stays missing and a successful list does not leave a `.tmp` file.

The CLI prints one book per line to stdout and exits 0:

- with an author: `<title> - <author>`
- without an author: `<title>`

No header and no "no books" line. An empty result is empty stdout. Errors from an unreadable file go to stderr with the usage line and exit 1.

Alternative: print JSON. Easier to pipe, but the request is to print the list for the person running the command, and the add command already uses a one-line text message.

### Match part of the author, ignoring case

Trim the filter. A book matches when its stored author contains that filter. Compare both sides with `toLowerCase()`. The stored value is trimmed only for the comparison; the file is not rewritten. A book with no author never matches. `"Frank"` matches `"Frank Herbert"`.

A present `--author` whose trimmed value is empty fails before the file is read, with a clear error, usage on stderr, and exit 1.

Alternative: locale-aware matching. Rejected because `toLowerCase()` stays stable across machines.

## Risks / Trade-offs

- [Author match is ASCII case-folding] → Accepted for a personal list. Names that differ only by locale-specific case still match under `toLowerCase()`.
- [A valid array of malformed objects prints whatever title it has] → Same read rules as add. This change does not add per-book validation.
- [Usage text changes for unknown commands] → `add` success and `add` errors still behave as they do now. The shared usage line also mentions `list`.

## Migration Plan

No file migration. Existing `data/books.json` files are listed as they are. Rollback is removing the `list` command. The capability purpose in `openspec/specs/reading-list/spec.md` still describes only adding a book; widen that sentence when this change is archived.
