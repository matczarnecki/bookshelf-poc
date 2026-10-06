import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const cliPath = fileURLToPath(new URL("./cli.ts", import.meta.url));
const tsxLoader = fileURLToPath(
  new URL("../node_modules/tsx/dist/loader.mjs", import.meta.url),
);

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function runCli(cwd: string, args: readonly string[]): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", tsxLoader, cliPath, ...args], {
      cwd,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function createTempDir(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "bookshelf-cli-"));
  directories.push(directory);
  return directory;
}

async function writeList(directory: string, contents: Buffer): Promise<string> {
  const filePath = path.join(directory, "data", "books.json");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
  return filePath;
}

type StoredBook = {
  id: string;
  title: string;
  addedAt: string;
  author?: string;
};

function storedBook(id: string, title: string, author?: string): StoredBook {
  const book: StoredBook = {
    id,
    title,
    addedAt: "2026-01-01T00:00:00.000Z",
  };
  if (author !== undefined) {
    book.author = author;
  }
  return book;
}

async function writeBooks(
  directory: string,
  books: readonly StoredBook[],
): Promise<{ filePath: string; original: Buffer }> {
  const original = Buffer.from(`${JSON.stringify(books, null, 2)}\n`);
  const filePath = await writeList(directory, original);
  return { filePath, original };
}

describe("bookshelf list", () => {
  it("prints every book in stored order", async () => {
    const directory = await createTempDir();
    const { filePath, original } = await writeBooks(directory, [
      storedBook("1", "Dune", "Frank Herbert"),
      storedBook("2", "Neuromancer", "William Gibson"),
    ]);

    const result = await runCli(directory, ["list"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      "Dune - Frank Herbert\nNeuromancer - William Gibson\n",
    );
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("prints a title when the book has no author", async () => {
    const directory = await createTempDir();
    const { filePath, original } = await writeBooks(directory, [
      storedBook("1", "Dune"),
    ]);

    const result = await runCli(directory, ["list"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Dune\n");
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("prints nothing for an empty file", async () => {
    const directory = await createTempDir();
    const original = Buffer.from("[]\n");
    const filePath = await writeList(directory, original);

    const result = await runCli(directory, ["list"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("prints the one book whose author matches", async () => {
    const directory = await createTempDir();
    const { filePath, original } = await writeBooks(directory, [
      storedBook("1", "Dune", "Frank Herbert"),
      storedBook("2", "Neuromancer", "William Gibson"),
    ]);

    const result = await runCli(directory, ["list", "--author", "Frank Herbert"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Dune - Frank Herbert\n");
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("prints a book when part of the author matches", async () => {
    const directory = await createTempDir();
    const { filePath, original } = await writeBooks(directory, [
      storedBook("1", "Dune", "Frank Herbert"),
      storedBook("2", "Neuromancer", "William Gibson"),
    ]);

    const result = await runCli(directory, ["list", "--author", "Frank"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Dune - Frank Herbert\n");
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("prints two books by the same author in stored order", async () => {
    const directory = await createTempDir();
    const { filePath, original } = await writeBooks(directory, [
      storedBook("1", "Dune", "Frank Herbert"),
      storedBook("2", "Children of Dune", "Frank Herbert"),
    ]);

    const result = await runCli(directory, ["list", "--author", "Frank Herbert"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(
      "Dune - Frank Herbert\nChildren of Dune - Frank Herbert\n",
    );
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("matches a padded author in a different case", async () => {
    const directory = await createTempDir();
    const { filePath, original } = await writeBooks(directory, [
      storedBook("1", "Dune", "Frank Herbert"),
    ]);

    const result = await runCli(directory, [
      "list",
      "--author",
      "  frank herbert  ",
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("Dune - Frank Herbert\n");
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("prints nothing when the author does not match", async () => {
    const directory = await createTempDir();
    const { filePath, original } = await writeBooks(directory, [
      storedBook("1", "Dune", "Frank Herbert"),
    ]);

    const result = await runCli(directory, [
      "list",
      "--author",
      "Ursula K. Le Guin",
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("prints nothing when the only book has no author", async () => {
    const directory = await createTempDir();
    const { filePath, original } = await writeBooks(directory, [
      storedBook("1", "Dune"),
    ]);

    const result = await runCli(directory, ["list", "--author", "Frank Herbert"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("fails when the author filter is blank and leaves the file unchanged", async () => {
    const directory = await createTempDir();
    const original = Buffer.from("[]\n");
    const filePath = await writeList(directory, original);

    const result = await runCli(directory, ["list", "--author", "   "]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("An author filter cannot be blank.");
    expect(result.stderr).toContain("Usage:");
    expect(result.stderr).toContain(filePath);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("fails when the author flag has no value and leaves the file unchanged", async () => {
    const directory = await createTempDir();
    const original = Buffer.from("[]\n");
    const filePath = await writeList(directory, original);

    const result = await runCli(directory, ["list", "--author"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("argument missing");
    expect(result.stderr).toContain("Usage:");
    expect(result.stderr).toContain(filePath);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("prints nothing when the file is missing and does not create it", async () => {
    const directory = await createTempDir();
    const filePath = path.join(directory, "data", "books.json");

    const result = await runCli(directory, ["list"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    await expect(readFile(filePath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("fails when the file is not a book list and leaves it unchanged", async () => {
    const directory = await createTempDir();
    const original = Buffer.from("{not json");
    const filePath = await writeList(directory, original);

    const result = await runCli(directory, ["list"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("not valid JSON");
    expect(result.stderr).toContain("Usage:");
    expect(result.stderr).toContain(filePath);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
    await expect(readFile(`${filePath}.tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

describe("bookshelf add", () => {
  it("adds a book and prints the stored title", async () => {
    const directory = await createTempDir();

    const result = await runCli(directory, [
      "add",
      "--title",
      "Dune",
      "--author",
      "Frank Herbert",
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe('Added "Dune".\n');
    expect(result.stderr).toBe("");

    const filePath = path.join(directory, "data", "books.json");
    const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
    expect(parsed).toMatchObject([
      { title: "Dune", author: "Frank Herbert" },
    ]);
  });

  it("fails when the title is missing and leaves the file unchanged", async () => {
    const directory = await createTempDir();
    const original = Buffer.from("[]\n");
    const filePath = await writeList(directory, original);

    const result = await runCli(directory, ["add"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("A title is required.");
    expect(result.stderr).toContain(filePath);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("fails when the title is blank and leaves the file unchanged", async () => {
    const directory = await createTempDir();
    const original = Buffer.from("[]\n");
    const filePath = await writeList(directory, original);

    const result = await runCli(directory, ["add", "--title", "   "]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("A title is required.");
    expect(result.stderr).toContain(filePath);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
  });

  it("fails when the file is not a list of books and leaves it unchanged", async () => {
    const directory = await createTempDir();
    const original = Buffer.from('{"title":"Dune"}\n');
    const filePath = await writeList(directory, original);

    const result = await runCli(directory, [
      "add",
      "--title",
      "Dune",
      "--author",
      "Frank Herbert",
    ]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("expected a list of books");
    expect(result.stderr).toContain(filePath);
    expect(Buffer.compare(await readFile(filePath), original)).toBe(0);
    await expect(readFile(`${filePath}.tmp`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
