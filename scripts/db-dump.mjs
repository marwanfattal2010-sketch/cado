/**
 * A real Postgres dump of the CADO database — roles, schema, and data — using
 * the Supabase CLI.
 *
 * This is NOT the same thing as backup-database.mjs sitting next to it, and
 * both are worth having:
 *
 *   backup-database.mjs  every row of every table, as JSON, plus the photos
 *                        from Storage. Runs nightly with the service role key
 *                        that is already on this machine. Restoring it means
 *                        re-running the migrations and inserting the rows back.
 *
 *   this file            the three .sql files pg_dump produces. Restores the
 *                        database as it actually was — roles, policies,
 *                        functions, triggers, sequences and data — without
 *                        replaying twenty-odd migrations and hoping they land
 *                        the same way. This is what you want the hour after a
 *                        migration goes wrong.
 *
 * THE ONE SECRET IT NEEDS
 *
 * pg_dump connects to Postgres directly, so it needs the database connection
 * string — which contains the database password. That is a different secret
 * from the service role key and from a management token, and it is not in
 * this repo and must never be.
 *
 * Put it in a file OUTSIDE the repo, one line, nothing else:
 *
 *   C:\Users\Marwan\cado-secrets\supabase-db-url.txt
 *
 * Copy the string from the Supabase dashboard: Connect → Session pooler (or
 * Direct connection), then paste your database password in place of
 * [YOUR-PASSWORD]. It looks like:
 *
 *   postgresql://postgres.tzuntmerjhegkzsbfmnf:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
 *
 * Or set SUPABASE_DB_URL in the environment instead; that wins if both exist.
 *
 * Output goes to C:\Users\Marwan\cado-backups\dumps\<timestamp>\ — outside the
 * repo, because a data dump holds real customer names, phones and addresses
 * and committing it would publish them to GitHub.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SECRET_FILE = "C:\\Users\\Marwan\\cado-secrets\\supabase-db-url.txt";
const OUT_ROOT = "C:\\Users\\Marwan\\cado-backups\\dumps";

function connectionString() {
  const fromEnv = process.env.SUPABASE_DB_URL?.trim();
  if (fromEnv) return fromEnv;
  if (!existsSync(SECRET_FILE)) {
    console.error(
      [
        "No database connection string found.",
        "",
        `Create this file, with the connection string on one line:`,
        `  ${SECRET_FILE}`,
        "",
        "Get it from the Supabase dashboard: Connect -> Session pooler,",
        "then replace [YOUR-PASSWORD] with your database password.",
        "",
        "Nothing was dumped.",
      ].join("\n")
    );
    process.exit(1);
  }
  const value = readFileSync(SECRET_FILE, "utf8").trim();
  if (!value.startsWith("postgres")) {
    console.error(`${SECRET_FILE} does not look like a postgres:// connection string. Nothing was dumped.`);
    process.exit(1);
  }
  return value;
}

/**
 * Each dump is a separate CLI call because pg_dump cannot produce roles,
 * schema and data in one pass in a form that restores cleanly. Restoring
 * means replaying them in this order.
 */
const PARTS = [
  { file: "1-roles.sql", args: ["--role-only"], label: "roles" },
  { file: "2-schema.sql", args: [], label: "schema (tables, functions, policies, triggers)" },
  { file: "3-data.sql", args: ["--data-only", "--use-copy"], label: "data" },
];

function main() {
  const dbUrl = connectionString();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = join(OUT_ROOT, stamp);
  mkdirSync(outDir, { recursive: true });

  console.log(`Dumping to ${outDir}`);

  for (const part of PARTS) {
    const target = join(outDir, part.file);
    process.stdout.write(`  ${part.label}... `);
    try {
      execFileSync(
        "npx",
        ["--yes", "supabase", "db", "dump", "--db-url", dbUrl, "-f", target, ...part.args],
        { stdio: ["ignore", "pipe", "pipe"], shell: true }
      );
    } catch (e) {
      // The connection string is in the command line, so the CLI's own error
      // text can echo it back. Print only the last line, and never the args.
      const detail = String(e.stderr ?? e.message ?? "")
        .split(/\r?\n/)
        .filter(Boolean)
        .pop();
      console.log("FAILED");
      console.error(`\n  ${detail ?? "unknown error"}`);
      console.error("\nNothing further was dumped. The database was only read from, never written to.");
      process.exit(1);
    }
    const size = statSync(target).size;
    if (size === 0) {
      console.log("EMPTY — treating as a failure");
      process.exit(1);
    }
    console.log(`ok (${(size / 1024).toFixed(0)} KB)`);
  }

  console.log(`\nDone. Three files in ${outDir}`);
  console.log("Restore order: 1-roles.sql, then 2-schema.sql, then 3-data.sql.");
}

main();
