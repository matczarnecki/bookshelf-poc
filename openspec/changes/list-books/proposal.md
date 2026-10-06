# Proposal

## Why

Books can be saved, but the CLI cannot show them. A list command is the next reading-list behavior: print what is stored, and narrow that printout to one author.

## What Changes

- Add `bookshelf list`, which prints each saved book and exits successfully.
- Accept an optional `--author` filter. When it is present, print only books whose stored author matches that name. A missing or blank `--author` value is a failed command with a clear error.
- Matching compares the trimmed filter with the stored author and ignores letter case. It is a whole-name match. Books with no author are omitted when a filter is set.
- Print books in the order they are stored. An empty list, or a filter that matches nothing, still exits successfully and prints no books.
- A missing reading-list file prints no books and is not created. An unreadable file fails with a clear error and is left unchanged. Listing never writes the file.
- Leave editing, removing, sorting, title filters, partial author matches, ratings, notes, and remote lookup out of this change. The existing add command stays as specified.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `reading-list`: Add requirements for printing the saved books and filtering that printout by author. Existing add requirements do not change.

## Impact

- Extends the CLI in `src/cli.ts` and the reading-list module in `src/reading-list.ts`, plus their tests.
- Reads the existing local JSON file. The stored book shape does not change.
- No new dependencies, server, or accounts.
