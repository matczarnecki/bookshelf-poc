import path from "node:path";
import { parseArgs } from "node:util";
import { addBook, listBooks, type Book } from "./reading-list.js";

const booksPath = path.join(process.cwd(), "data", "books.json");

type ParsedCommand =
  | { ok: true; command: "add"; title: string; author: string | undefined }
  | { ok: true; command: "list"; author: string | undefined }
  | { ok: false; message: string };

function usage(): string {
  return [
    "Usage: bookshelf add --title <title> [--author <author>]",
    "       bookshelf list [--author <author>]",
    `Reading list: ${booksPath}`,
  ].join("\n");
}

function fail(message: string): never {
  console.error(message);
  console.error(usage());
  process.exit(1);
}

function parseCommand(args: readonly string[]): ParsedCommand {
  const commandName = args[0];
  try {
    if (commandName === "add") {
      return parseAdd(args);
    }
    if (commandName === "list") {
      return parseList(args);
    }
    return { ok: false, message: "Unknown command. Expected add or list." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid arguments.";
    return { ok: false, message };
  }
}

function parseAdd(args: readonly string[]): ParsedCommand {
  const { values } = parseArgs({
    args: [...args],
    allowPositionals: true,
    options: {
      title: { type: "string" },
      author: { type: "string" },
    },
  });

  const title = values.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    return { ok: false, message: "A title is required." };
  }

  const author = typeof values.author === "string" ? values.author : undefined;
  return { ok: true, command: "add", title, author };
}

function parseList(args: readonly string[]): ParsedCommand {
  const { values } = parseArgs({
    args: [...args],
    allowPositionals: true,
    options: {
      author: { type: "string" },
    },
  });

  if (typeof values.author === "string" && values.author.trim().length === 0) {
    return { ok: false, message: "An author filter cannot be blank." };
  }

  const author = typeof values.author === "string" ? values.author : undefined;
  return { ok: true, command: "list", author };
}

function bookLine(book: Book): string {
  if (book.author === undefined || book.author.length === 0) {
    return book.title;
  }
  return `${book.title} - ${book.author}`;
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2));
  if (!command.ok) {
    fail(command.message);
  }

  if (command.command === "list") {
    try {
      const books = await listBooks(booksPath, command.author);
      for (const book of books) {
        console.log(bookLine(book));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not list the books.";
      fail(message);
    }
    return;
  }

  try {
    const book = await addBook(booksPath, {
      title: command.title,
      author: command.author,
    });
    console.log(`Added "${book.title}".`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not add the book.";
    fail(message);
  }
}

await main();
