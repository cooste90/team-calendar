import pg from "pg";

// Makes sure these business units exist in the e2e test database. (From T13 the seed
// does this; until then, tests create what they need.)
export async function ensureBusinessUnits(...names: string[]) {
  const client = new pg.Client(process.env.DATABASE_URL_TEST);
  await client.connect();
  for (const name of names) {
    await client.query(
      `INSERT INTO "BusinessUnit" (id, name, slug, "updatedAt")
       VALUES (gen_random_uuid()::text, $1, lower($1), now())
       ON CONFLICT DO NOTHING`,
      [name],
    );
  }
  await client.end();
}
