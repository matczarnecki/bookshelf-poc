# Proposal

## Why

The project has no way to record a book the user intends to read. A single add command is the smallest step that makes a personal reading list real: the user can capture a title before it is forgotten.

## What Changes

- Add a `bookshelf add` command that accepts a title and an author and appends the book to a local JSON file.
- Require a non-empty title. Reject a missing or blank title with a clear message and leave the file unchanged.
- Treat author as optional. Omit it when the user does not supply one, or supplies only whitespace.
- Allow another book with the same title and author. This change does not deduplicate.
- Leave listing, editing, removing, status, ratings, notes, and remote lookup out of this change.

## Capabilities

### New Capabilities

- `reading-list`: Persist books the user intends to read, starting with adding one book from the CLI.

### Modified Capabilities

- None. The project has no existing specs.

## Impact

- Introduces the CLI in a repository that currently has no application source, tests, or package manifest. This change covers only the add command and the JSON file it writes.
- The reading list lives in a local JSON file on this machine. No network, accounts, or extra services.
- Later list and remove commands can extend `reading-list` without a second capability.
