import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addBook, ReadingListError } from "./reading-list.js";

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
