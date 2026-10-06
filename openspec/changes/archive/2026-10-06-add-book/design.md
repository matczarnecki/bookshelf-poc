# Design

## Context

The repository has OpenSpec planning files and no application source. See proposal.md for why this change exists. Behavior is specified in `specs/reading-list/spec.md`.

The add command is the first code in the project, so this design also chooses the initial CLI shape and the on-disk list format.

## Goals / Non-Goals

**Goals:**

- One path from `bookshelf add` flags to an appended JSON record.
- Tests can point that path at a temporary file instead of the developer's list.
- A failed add never replaces an existing file.

**Non-Goals:**

- A database, a CLI framework, or a layered domain model.
- Commands other than `add`.
- File locking for concurrent writers.

## Decisions

### TypeScript CLI, tested with Vitest

The repo is a greenfield Node.js project, so this change creates the package, TypeScript config, and test runner along with the command. Strict TypeScript and Vitest match the stack already named for the project.

Alternative: a shell script that appends JSON. Rejected because later commands would outgrow it, and the project is already aimed at TypeScript.

### Parse flags with `node:util` `parseArgs`

`bookshelf add` takes `--title <title>` and optional `--author <author>`. Node's built-in parser covers that without a dependency. Unknown commands and a missing title print a short usage line to stderr and exit 1. Success prints `Added "<title>".` to stdout and exits 0. Errors go to stderr.

Alternative: Commander.js. Useful once there are many subcommands. Unnecessary for a single command with two flags.

### Store an array of book objects in `data/books.json`

The file is a JSON array, relative to the current working directory. Each object has:

- `id`: a new UUID, so two identical titles stay distinct
- `title`: trimmed, required
- `author`: trimmed, present only when the user supplied a non-blank author
- `addedAt`: ISO-8601 timestamp

A missing file, or a missing `data/` directory, is created on the first successful add. An empty array is a valid list. Any other JSON value, or invalid JSON, is unreadable: the command exits 1 and does not write.

The path is an argument of the storage function. The CLI default is `data/books.json`. Tests pass a temporary path.

`data/books.json` is gitignored so a personal list is not committed.

Alternative: one JSON object keyed by title. Rejected because duplicate titles must both be stored.

### Write via a temporary file, then rename

Read and parse the whole file, append the record in memory, write `data/books.json.tmp` in the same directory, then rename it over the destination. A crash during the write leaves the previous file in place. Validation failures return before any write.

Alternative: append a JSON line. Easier to stream, but the spec treats the file as one list, and a single array stays easy to read by hand.

## Risks / Trade-offs

- [Path follows the current working directory] → Document that `data/books.json` is created where the command is run. Tests never use the repo's `data/` directory.
- [Two overlapping adds can lose a write] → Accepted for a single-user local file. No lock in this change.
- [UUID and `addedAt` are not in the spec] → They do not change the required title and author behavior, and they avoid a format change when a later command addresses one book.
- [A hand-edited file that is valid JSON but not an array is rejected] → The error names the path. The file is left as the user wrote it.

## Migration Plan

There is no existing list to migrate. The first successful `bookshelf add` creates `data/books.json`. Rollback is removing the command and deleting that file.
