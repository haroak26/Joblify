import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgres://postgres:postgres@127.0.0.1:5432/joblify_test";

const { DatabaseStorage } = await import("./storage");
const { db } = await import("./db");
const { users, profiles, subscriptions, usage } = await import("@shared/schema");

type RecordStore = {
  users: Array<Record<string, unknown>>;
  profiles: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
  usage: Array<Record<string, unknown>>;
};

function createTransactionHarness(failOnTable?: unknown) {
  const committed: RecordStore = {
    users: [],
    profiles: [],
    subscriptions: [],
    usage: [],
  };

  const transaction = async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
    const staged: RecordStore = {
      users: [],
      profiles: [],
      subscriptions: [],
      usage: [],
    };

    const tx = {
      insert(table: unknown) {
        return {
          values(values: Record<string, unknown>) {
            if (table === users) {
              const createdUser = {
                ...values,
                id: (values.id as string | undefined) ?? "generated-user-id",
              };
              staged.users.push(createdUser);
              return {
                async returning() {
                  return [createdUser];
                },
              };
            }

            if (table === failOnTable) {
              throw new Error("simulated downstream insert failure");
            }

            if (table === profiles) {
              staged.profiles.push(values);
              return Promise.resolve();
            }

            if (table === subscriptions) {
              staged.subscriptions.push(values);
              return Promise.resolve();
            }

            if (table === usage) {
              staged.usage.push(values);
              return Promise.resolve();
            }

            throw new Error("Unknown table insert");
          },
        };
      },
    };

    try {
      const result = await callback(tx);
      committed.users.push(...staged.users);
      committed.profiles.push(...staged.profiles);
      committed.subscriptions.push(...staged.subscriptions);
      committed.usage.push(...staged.usage);
      return result;
    } catch (error) {
      return Promise.reject(error);
    }
  };

  return { committed, transaction };
}

test("createUser rolls back all inserts when a downstream insert fails", async () => {
  const storage = new DatabaseStorage();
  const originalTransaction = db.transaction;
  const harness = createTransactionHarness(usage);
  (db as any).transaction = harness.transaction;

  try {
    await assert.rejects(
      storage.createUser({
        username: "rollback-user",
        email: "rollback@example.com",
        password: "hashed-password",
      } as any),
      /simulated downstream insert failure/
    );

    assert.equal(harness.committed.users.length, 0, "no user should be committed");
    assert.equal(harness.committed.profiles.length, 0, "no profile should be committed");
    assert.equal(harness.committed.subscriptions.length, 0, "no subscription should be committed");
    assert.equal(harness.committed.usage.length, 0, "no usage row should be committed");
  } finally {
    (db as any).transaction = originalTransaction;
  }
});

test("createUser commits all related records and returns user on success", async () => {
  const storage = new DatabaseStorage();
  const originalTransaction = db.transaction;
  const harness = createTransactionHarness();
  (db as any).transaction = harness.transaction;

  try {
    const created = await storage.createUser({
      username: "success-user",
      email: "success@example.com",
      password: "hashed-password",
    } as any);

    assert.equal(created.id, "generated-user-id");
    assert.equal(harness.committed.users.length, 1);
    assert.equal(harness.committed.profiles.length, 1);
    assert.equal(harness.committed.subscriptions.length, 1);
    assert.equal(harness.committed.usage.length, 1);
    assert.equal(harness.committed.profiles[0].userId, created.id);
    assert.equal(harness.committed.subscriptions[0].userId, created.id);
    assert.equal(harness.committed.usage[0].userId, created.id);
  } finally {
    (db as any).transaction = originalTransaction;
  }
});
