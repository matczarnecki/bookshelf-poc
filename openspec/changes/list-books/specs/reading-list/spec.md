# Spec Delta

## ADDED Requirements

### Requirement: Print saved books
The system MUST print every saved book, in stored order, when the user runs `bookshelf list` without an author filter. On success the command MUST exit successfully. Each book's output MUST include its title and MUST include its author when the book has one.

#### Scenario: Print every book
- **GIVEN** a list containing "Dune" by "Frank Herbert" and then "Neuromancer" by "William Gibson"
- **WHEN** the user runs `bookshelf list`
- **THEN** the output lists "Dune" before "Neuromancer", includes both titles and both authors, and the command exits successfully

#### Scenario: Book without an author
- **GIVEN** a list containing a book titled "Dune" with no author
- **WHEN** the user runs `bookshelf list`
- **THEN** the output includes "Dune" and the command exits successfully

#### Scenario: Empty list
- **GIVEN** a reading list file that contains no books
- **WHEN** the user runs `bookshelf list`
- **THEN** the command exits successfully and prints no books

### Requirement: Filter the list by author
The system MUST print only books whose stored author matches `--author` when that value is not empty after trimming. The comparison MUST ignore letter case and MUST use the whole trimmed name. Books with no stored author MUST be omitted. Matching books MUST stay in stored order. On success the command MUST exit successfully.

#### Scenario: One author matches
- **GIVEN** a list containing "Dune" by "Frank Herbert" and "Neuromancer" by "William Gibson"
- **WHEN** the user runs `bookshelf list --author "Frank Herbert"`
- **THEN** the output includes "Dune" and "Frank Herbert", does not include "Neuromancer", and the command exits successfully

#### Scenario: Two books by the same author
- **GIVEN** a list containing "Dune" by "Frank Herbert" and then "Children of Dune" by "Frank Herbert"
- **WHEN** the user runs `bookshelf list --author "Frank Herbert"`
- **THEN** the output lists "Dune" before "Children of Dune" and the command exits successfully

#### Scenario: Case and surrounding space differ
- **GIVEN** a list containing "Dune" by "Frank Herbert"
- **WHEN** the user runs `bookshelf list --author "  frank herbert  "`
- **THEN** the output includes "Dune" and the command exits successfully

#### Scenario: Author does not match
- **GIVEN** a list containing "Dune" by "Frank Herbert"
- **WHEN** the user runs `bookshelf list --author "Ursula K. Le Guin"`
- **THEN** the command exits successfully and prints no books

#### Scenario: Book has no author
- **GIVEN** a list containing a book titled "Dune" with no author
- **WHEN** the user runs `bookshelf list --author "Frank Herbert"`
- **THEN** the command exits successfully and prints no books

### Requirement: Blank author filter is rejected
The system MUST reject `bookshelf list` when `--author` is present and empty after trimming whitespace, or when the flag has no value. The command MUST exit with a failure, MUST show a clear error, and MUST leave the reading list file unchanged.

#### Scenario: Author flag is blank
- **GIVEN** a reading list file
- **WHEN** the user runs `bookshelf list --author "   "`
- **THEN** the command fails with a clear error and the file is unchanged

#### Scenario: Author flag has no value
- **GIVEN** a reading list file
- **WHEN** the user runs `bookshelf list --author` with no value
- **THEN** the command fails with a clear error and the file is unchanged

### Requirement: Missing list file prints nothing
The system MUST treat a missing reading list file as an empty list. The command MUST exit successfully, MUST print no books, and MUST NOT create the file.

#### Scenario: No file
- **GIVEN** no reading list file
- **WHEN** the user runs `bookshelf list`
- **THEN** the command exits successfully, prints no books, and the file still does not exist

### Requirement: Listing leaves the file unchanged
The system MUST NOT modify the reading list file when `bookshelf list` succeeds.

#### Scenario: Successful list
- **GIVEN** a readable reading list file
- **WHEN** the user runs `bookshelf list`
- **THEN** the file contents are unchanged

### Requirement: Unreadable list is not printed
The system MUST refuse to list books when the existing reading list file cannot be read as a list of books. The command MUST exit with a failure, MUST show a clear error, and MUST leave the file unchanged.

#### Scenario: File is not a book list
- **GIVEN** a reading list file whose contents are not a list of books
- **WHEN** the user runs `bookshelf list`
- **THEN** the command fails with a clear error and the file contents are unchanged
