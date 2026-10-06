import path from "node:path";
import { parseArgs } from "node:util";
import { addBook } from "./reading-list.js";

const booksPath = path.join(process.cwd(), "data", "books.json");

type ParsedCommand =
  | { ok: true; title: string; author: string | undefined }
  | { ok: false; message: string };

function usage(): string {
  return [
    "Usage: bookshelf add --title <title> [--author <author>]",
    `Reading list: ${booksPath}`,
  ].join("\n");
}

function fail(message: string): never {
  console.error(message);
  console.error(usage());
  process.exit(1);
}

function parseCommand(args: readonly string[]): ParsedCommand {
  try {
    const { positionals, values } = parseArgs({
      args: [...args],
      allowPositionals: true,
      options: {
        title: { type: "string" },
        author: { type: "string" },
      },
    });

    if (positionals[0] !== "add") {
      return { ok: false, message: "Unknown command. Expected add." };
    }

    const title = values.title;
    if (typeof title !== "string" || title.trim().length === 0) {
      return { ok: false, message: "A title is required." };
    }

    const author = typeof values.author === "string" ? values.author : undefined;
    return { ok: true, title, author };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid arguments.";
    return { ok: false, message };
  }
}

async function main(): Promise<void> {
  const command = parseCommand(process.argv.slice(2));
  if (!command.ok) {
    fail(command.message);
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
