import { expect, it } from "vitest";
import { db, lockUsers } from "@/server/db";
import { createUser } from "./helpers/create-user";

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

it.each([
  {
    rule: "a second transaction locking the same person waits for the first to finish",
    secondLocks: "anna",
    expected: ["first locked", "first done", "second locked"],
  },
  {
    rule: "transactions locking different people don't wait for each other",
    secondLocks: "ben",
    expected: ["first locked", "second locked", "first done"],
  },
])("$rule", async ({ secondLocks, expected }) => {
  await createUser("anna");
  await createUser("ben");
  const order: string[] = [];

  // The first transaction locks Anna, then holds the lock for a moment.
  let tellSecondToStart = () => {};
  const firstHasLock = new Promise<void>((resolve) => {
    tellSecondToStart = resolve;
  });
  const first = db.$transaction(async (tx) => {
    await lockUsers(tx, ["anna"]);
    order.push("first locked");
    tellSecondToStart();
    await pause(300);
    order.push("first done");
  });

  await firstHasLock;
  const second = db.$transaction(async (tx) => {
    await lockUsers(tx, [secondLocks]);
    order.push("second locked");
  });

  await Promise.all([first, second]);
  expect(order).toEqual(expected);
});
