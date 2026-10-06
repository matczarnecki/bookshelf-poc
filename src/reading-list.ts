import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type Book = {
  id: string;
  title: string;
  addedAt: string;
  author?: string;
};

export type AddBookInput = {
  title: string;
  author?: string;
};

export class ReadingListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReadingListError";
  }
}

export async function addBook(
  filePath: string,
  input: AddBookInput,
): Promise<Book> {
  const title = input.title.trim();
  if (title.length === 0) {
    throw new ReadingListError("A title is required.");
  }

  const books = await readBooks(filePath);
  const book = createBook(title, input.author);
  books.push(book);
  await writeBooks(filePath, books);
  return book;
}

function createBook(title: string, author: string | undefined): Book {
  const book: Book = {
    id: randomUUID(),
    title,
    addedAt: new Date().toISOString(),
  };
  const trimmedAuthor = author?.trim() ?? "";
  if (trimmedAuthor.length > 0) {
    book.author = trimmedAuthor;
  }
  return book;
}

async function readBooks(filePath: string): Promise<Book[]> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isEnoent(error)) {
      return [];
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ReadingListError(
      `Cannot read ${filePath}: the file is not valid JSON.`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new ReadingListError(
      `Cannot read ${filePath}: expected a list of books.`,
    );
  }

  return parsed as Book[];
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function writeBooks(
  filePath: string,
  books: readonly Book[],
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(books, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}
