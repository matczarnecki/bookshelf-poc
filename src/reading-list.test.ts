import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addBook,
  listBooks,
  ReadingListError,
  type Book,
} from "./reading-list.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createTempDir(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "bookshelf-"));
  directories.push(directory);
  return directory;
}

describe("listBooks", () => {
  it("returns every book in stored order, including a book with no author", async () => {
    const filePath = path.join(await createTempDir(), "books.json");
    const original = Buffer.from(
      `${JSON.stringify(
        [
          { id: "1", title: "Dune", addedAt: "2026-01-01T00:00:00.000Z" },
          {
            id: "2",
            title: "Neuromancer",
            addedAt: "2026-01-02T00:00:00.000Z",
            author: "William Gibson",
          },
        ],
        null,
        2,
      )}\n`,
    );
    await writeFile(filePath, original);

    const books = await listBooks(filePath);

    expect(books.map((book) => book.title)).toEqual(["Dune", "Neuromancer"]);
    expect(books[0]).not.toHaveProperty("author");
    expect(books[1]?.author).toBe("William Gibson");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
    await expect(readFile(`${filePath}.tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("returns an empty array for an empty list file", async () => {
    const filePath = path.join(await createTempDir(), "books.json");
    const original = Buffer.from("[]\n");
    await writeFile(filePath, original);

    await expect(listBooks(filePath)).resolves.toEqual([]);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("returns the one book whose author matches", async () => {
    const { filePath, original } = await writeBooks([
      book("1", "Dune", "Frank Herbert"),
      book("2", "Neuromancer", "William Gibson"),
    ]);

    const books = await listBooks(filePath, "Frank Herbert");

    expect(books.map((entry) => entry.title)).toEqual(["Dune"]);
    expect(books[0]?.author).toBe("Frank Herbert");
    await expectUnchanged(filePath, original);
  });

  it("keeps two matches in stored order", async () => {
    const { filePath, original } = await writeBooks([
      book("1", "Dune", "Frank Herbert"),
      book("2", "Children of Dune", "Frank Herbert"),
    ]);

    const books = await listBooks(filePath, "Frank Herbert");

    expect(books.map((entry) => entry.title)).toEqual([
      "Dune",
      "Children of Dune",
    ]);
    await expectUnchanged(filePath, original);
  });

  it("matches a different case and surrounding spaces", async () => {
    const { filePath, original } = await writeBooks([
      book("1", "Dune", "Frank Herbert"),
    ]);

    const books = await listBooks(filePath, "  frank herbert  ");

    expect(books.map((entry) => entry.title)).toEqual(["Dune"]);
    await expectUnchanged(filePath, original);
  });

  it("returns no books when the author does not match", async () => {
    const { filePath, original } = await writeBooks([
      book("1", "Dune", "Frank Herbert"),
    ]);

    await expect(listBooks(filePath, "Ursula K. Le Guin")).resolves.toEqual([]);
    await expectUnchanged(filePath, original);
  });

  it("omits a book with no author when a filter is set", async () => {
    const { filePath, original } = await writeBooks([book("1", "Dune")]);

    await expect(listBooks(filePath, "Frank Herbert")).resolves.toEqual([]);
    await expectUnchanged(filePath, original);
  });

  it("matches a partial author name", async () => {
    const { filePath, original } = await writeBooks([
      book("1", "Dune", "Frank Herbert"),
      book("2", "Neuromancer", "William Gibson"),
    ]);

    const books = await listBooks(filePath, "Frank");

    expect(books.map((entry) => entry.title)).toEqual(["Dune"]);
    expect(books[0]?.author).toBe("Frank Herbert");
    await expectUnchanged(filePath, original);
  });

  it("returns an empty list when the file is missing and does not create it", async () => {
    const filePath = path.join(await createTempDir(), "books.json");

    await expect(listBooks(filePath)).resolves.toEqual([]);
    await expect(readFile(filePath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(`${filePath}.tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("throws when the file is invalid JSON and leaves the bytes unchanged", async () => {
    const filePath = path.join(await createTempDir(), "books.json");
    const original = Buffer.from("{not json");
    await writeFile(filePath, original);

    await expect(listBooks(filePath)).rejects.toBeInstanceOf(ReadingListError);
    await expectUnchanged(filePath, original);
  });

  it("throws when the file is not an array and leaves the bytes unchanged", async () => {
    const filePath = path.join(await createTempDir(), "books.json");
    const original = Buffer.from('{"title":"Dune"}\n');
    await writeFile(filePath, original);

    await expect(listBooks(filePath)).rejects.toBeInstanceOf(ReadingListError);
    await expectUnchanged(filePath, original);
  });
});

describe("addBook", () => {
  it("creates a missing file and stores the title and author", async () => {
    const filePath = path.join(await createTempDir(), "data", "books.json");

    await addBook(filePath, { title: "Dune", author: "Frank Herbert" });

    const books = await readBookList(filePath);
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({
      title: "Dune",
      author: "Frank Herbert",
    });
    expect(books[0]).toMatchObject({
      id: expect.any(String),
      addedAt: expect.any(String),
    });
    await expect(readFile(`${filePath}.tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps the first book when a second book is added", async () => {
    const filePath = path.join(await createTempDir(), "books.json");

    await addBook(filePath, { title: "Dune", author: "Frank Herbert" });
    await addBook(filePath, { title: "Neuromancer", author: "William Gibson" });

    const books = await readBookList(filePath);
    expect(books.map(bookTitle)).toEqual(["Dune", "Neuromancer"]);
  });

  it("stores the same title and author twice", async () => {
    const filePath = path.join(await createTempDir(), "books.json");

    await addBook(filePath, { title: "Dune", author: "Frank Herbert" });
    await addBook(filePath, { title: "Dune", author: "Frank Herbert" });

    const books = (await readBookList(filePath)).map(asBook);
    expect(books).toHaveLength(2);
    expect(books[0]).toMatchObject({ title: "Dune", author: "Frank Herbert" });
    expect(books[1]).toMatchObject({ title: "Dune", author: "Frank Herbert" });
    expect(books[0]?.id).not.toBe(books[1]?.id);
  });

  it("trims padded title and author", async () => {
    const filePath = path.join(await createTempDir(), "books.json");

    await addBook(filePath, {
      title: "  Dune  ",
      author: "  Frank Herbert  ",
    });

    const books = await readBookList(filePath);
    expect(books[0]).toMatchObject({
      title: "Dune",
      author: "Frank Herbert",
    });
  });

  it("omits the author when it is missing or blank", async () => {
    const filePath = path.join(await createTempDir(), "books.json");

    await addBook(filePath, { title: "Dune" });
    await addBook(filePath, { title: "Neuromancer", author: "   " });

    const books = (await readBookList(filePath)).map(asBook);
    expect(books[0]?.title).toBe("Dune");
    expect(books[0]).not.toHaveProperty("author");
    expect(books[1]?.title).toBe("Neuromancer");
    expect(books[1]).not.toHaveProperty("author");
  });

  it("leaves invalid JSON unchanged", async () => {
    const filePath = path.join(await createTempDir(), "books.json");
    const original = Buffer.from("{not json");
    await writeFile(filePath, original);

    await expect(
      addBook(filePath, { title: "Dune", author: "Frank Herbert" }),
    ).rejects.toBeInstanceOf(ReadingListError);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("leaves a non-array file unchanged", async () => {
    const filePath = path.join(await createTempDir(), "books.json");
    const original = Buffer.from('{"title":"Dune"}\n');
    await writeFile(filePath, original);

    await expect(
      addBook(filePath, { title: "Dune", author: "Frank Herbert" }),
    ).rejects.toBeInstanceOf(ReadingListError);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });
});

function book(id: string, title: string, author?: string): Book {
  const stored: Book = {
    id,
    title,
    addedAt: "2026-01-01T00:00:00.000Z",
  };
  if (author !== undefined) {
    stored.author = author;
  }
  return stored;
}

async function writeBooks(
  books: readonly Book[],
): Promise<{ filePath: string; original: Buffer }> {
  const filePath = path.join(await createTempDir(), "books.json");
  const original = Buffer.from(`${JSON.stringify(books, null, 2)}\n`);
  await writeFile(filePath, original);
  return { filePath, original };
}

async function expectUnchanged(
  filePath: string,
  original: Buffer,
): Promise<void> {
  expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  await expect(readFile(`${filePath}.tmp`)).rejects.toMatchObject({
    code: "ENOENT",
  });
}

async function readBookList(filePath: string): Promise<unknown[]> {
  const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected a JSON array at ${filePath}.`);
  }
  return parsed;
}

function asBook(value: unknown): { id?: unknown; title?: unknown } {
  if (typeof value !== "object" || value === null) {
    throw new Error("Expected a book object.");
  }
  return value as { id?: unknown; title?: unknown };
}

function bookTitle(value: unknown): unknown {
  return asBook(value).title;
}
