# Spec Delta

## Purpose

The reading list stores books a person intends to read. This capability covers adding one book from the command line and keeping it in a local file.

## ADDED Requirements

### Requirement: Add a book by title
The system MUST append a book when the user runs `bookshelf add` with a `--title` value that is not empty after trimming whitespace. On success the command MUST exit successfully and its output MUST include the stored title. Books already in the list MUST remain.

#### Scenario: Add a book with title and author
- **GIVEN** a readable reading list
- **WHEN** the user runs `bookshelf add --title "Dune" --author "Frank Herbert"`
- **THEN** the list contains a book whose title is "Dune" and whose author is "Frank Herbert", the command exits successfully, and the output includes "Dune"

#### Scenario: Add a second book
- **GIVEN** the list already contains a book titled "Dune"
- **WHEN** the user runs `bookshelf add --title "Neuromancer" --author "William Gibson"`
- **THEN** the list contains both the existing "Dune" book and the new "Neuromancer" book

### Requirement: Title is required
The system MUST reject `bookshelf add` when `--title` is missing or empty after trimming whitespace. The command MUST exit with a failure, MUST show a clear error, and MUST leave the reading list file unchanged.

#### Scenario: Title flag omitted
- **GIVEN** a reading list file
- **WHEN** the user runs `bookshelf add` without `--title`
- **THEN** the command fails with a clear error and the file is unchanged

#### Scenario: Title is blank
- **GIVEN** a reading list file
- **WHEN** the user runs `bookshelf add --title "   "`
- **THEN** the command fails with a clear error and the file is unchanged

### Requirement: Author is optional
The system MUST save a book when `--author` is omitted. The system MUST NOT store an author when `--author` is empty after trimming whitespace.

#### Scenario: Author omitted
- **GIVEN** a readable reading list
- **WHEN** the user runs `bookshelf add --title "Dune"`
- **THEN** the list contains a book titled "Dune" with no author

#### Scenario: Author is blank
- **GIVEN** a readable reading list
- **WHEN** the user runs `bookshelf add --title "Dune" --author "   "`
- **THEN** the list contains a book titled "Dune" with no author

### Requirement: Stored text is trimmed
The system MUST store title and author with leading and trailing whitespace removed.

#### Scenario: Padded title and author
- **GIVEN** a readable reading list
- **WHEN** the user runs `bookshelf add --title "  Dune  " --author "  Frank Herbert  "`
- **THEN** the stored title is "Dune" and the stored author is "Frank Herbert"

### Requirement: Duplicate books are allowed
The system MUST save a new book even when the list already contains a book with the same title and author.

#### Scenario: Same title and author added twice
- **GIVEN** the list already contains one book titled "Dune" by "Frank Herbert"
- **WHEN** the user runs `bookshelf add --title "Dune" --author "Frank Herbert"`
- **THEN** the list contains two books titled "Dune" by "Frank Herbert"

### Requirement: Missing list file is created
The system MUST create the reading list file when it does not exist and MUST save the new book there.

#### Scenario: First add
- **GIVEN** no reading list file
- **WHEN** the user runs `bookshelf add --title "Dune" --author "Frank Herbert"`
- **THEN** the file exists and contains that book

### Requirement: Unreadable list is left unchanged
The system MUST refuse to add a book when the existing reading list file cannot be read as a list of books. The command MUST exit with a failure, MUST show a clear error, and MUST leave the file unchanged.

#### Scenario: File is not a book list
- **GIVEN** a reading list file whose contents are not a list of books
- **WHEN** the user runs `bookshelf add --title "Dune" --author "Frank Herbert"`
- **THEN** the command fails with a clear error and the file contents are unchanged
