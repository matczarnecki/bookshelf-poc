# Tasks

## 1. Reading list query

- [x] 1.1 Add a function in `src/reading-list.ts` that reads the existing JSON list and returns every book in stored order, including a book with no author and an empty array for an empty file. It must not write the file. Verify a Vitest test, using a temporary directory, covers stored order, a book with no author, and an empty file.
- [x] 1.2 Filter that result by an optional author. Trim the filter and compare it with the stored author using `toLowerCase()`. A book matches when the stored author contains that filter, so a partial name such as "Frank" matches "Frank Herbert". Keep stored order, omit books with no author, and treat a name that is not contained as no match. Verify Vitest cases for one match, two matches in order, different case and surrounding spaces, no match, a book with no author, and a partial name such as "Frank".
- [x] 1.3 A missing file returns an empty list and is not created. Invalid JSON or a non-array throws `ReadingListError` and leaves the file bytes unchanged, with no `.tmp` file left behind. Verify those Vitest cases, then run `npm test`.

## 2. List command

- [x] 2.1 In `src/cli.ts`, parse `list` separately from `add` with `node:util` `parseArgs`, accepting only `--author` for `list`. Print `<title> - <author>` or `<title>` to stdout, one book per line, and exit 0. Update the usage line so it names both commands and the `data/books.json` path. Verify CLI tests, each in its own temporary directory, for every book in order, a book with no author, an empty file, and unchanged file bytes.
- [x] 2.2 Pass `--author` through to the filter. Verify CLI tests for one matching author, a partial name such as "Frank", two books by the same author in stored order, a padded different-case author, no match, and a book with no author. Each success exits 0 and leaves the file unchanged.
- [x] 2.3 Reject a blank `--author` and an `--author` flag with no value: clear error and usage on stderr, exit 1, file unchanged. A missing file prints nothing, exits 0, and is not created. An unreadable file exits 1 with a clear error and leaves the file unchanged. Verify those CLI tests, and verify `npm test` still passes the existing `bookshelf add` tests.

## Workflow follow-up

- When this change is archived, widen the purpose in `openspec/specs/reading-list/spec.md` so it covers listing as well as adding a book.
