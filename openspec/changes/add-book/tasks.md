# Tasks

## 1. Project scaffold

- [x] 1.1 Add `package.json` (`type: module`, Node.js 24 or newer), a strict `tsconfig.json`, and Vitest with `passWithNoTests` so the suite can run before tests exist. Add a `bookshelf` script that runs `src/cli.ts` through `tsx`. Verify `npm install` completes and `npm test` exits 0.
- [x] 1.2 Ignore `data/books.json` in `.gitignore`. Verify `git check-ignore -v data/books.json` reports that rule.

## 2. Reading list storage

- [x] 2.1 Add `src/reading-list.ts` with a function that takes a file path, reads a JSON array, and appends a book with `id`, trimmed `title`, `addedAt`, and `author` only when the trimmed author is non-empty. Create missing parent directories. Write a sibling temporary file and rename it over the destination. Verify a Vitest test, using a temporary directory, creates a missing file and stores the title and author.
- [x] 2.2 Extend those tests for the rest of the file behavior: a second book keeps the first, the same title and author can be stored twice, padded title and author are trimmed, an omitted or blank author is absent, and invalid JSON or a non-array value fails without changing the file bytes. Verify `npm test` passes these cases.

## 3. Add command

- [x] 3.1 Add `src/cli.ts` that parses `add --title <title> [--author <author>]` with `node:util` `parseArgs` and writes to `data/books.json` in the current working directory. On success print `Added "<title>".` to stdout and exit 0. When the title is missing or blank, or the file is not a list of books, print a clear error and a usage line (including the `data/books.json` path) to stderr and exit 1 without modifying the file. Verify CLI tests, each in its own temporary directory, cover a successful add, a missing title, a blank title, and an unchanged unreadable file.
