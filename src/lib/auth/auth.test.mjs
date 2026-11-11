import test from "node:test";
import assert from "node:assert/strict";
import { registerUser, loginUser, sanitizeUser } from "./auth.ts";

test("registerUser creates a new valid user and prevents duplicate emails", () => {
  const users = [];
  const user1 = registerUser(users, "Budi Santoso", "budi@example.com", "password123");
  assert.equal(user1.name, "Budi Santoso");
  assert.equal(user1.email, "budi@example.com");
  assert.equal(users.length, 1);

  assert.throws(() => {
    registerUser(users, "Budi Dua", "budi@example.com", "password456");
  }, /Email sudah terdaftar/);
});

test("loginUser verifies password correctly and returns sanitized user", () => {
  const users = [];
  registerUser(users, "Siti Rahma", "siti@example.com", "rahasia123");

  const loggedIn = loginUser(users, "siti@example.com", "rahasia123");
  assert.equal(loggedIn.name, "Siti Rahma");
  assert.equal("passwordHash" in loggedIn, false);

  assert.throws(() => {
    loginUser(users, "siti@example.com", "salahpassword");
  }, /Password tidak sesuai/);

  assert.throws(() => {
    loginUser(users, "unknown@example.com", "rahasia123");
  }, /Akun tidak ditemukan/);
});

test("sanitizeUser strips passwordHash", () => {
  const raw = { id: "u-1", name: "Andi", email: "andi@test.com", passwordHash: "secret_hash", createdAt: Date.now() };
  const safe = sanitizeUser(raw);
  assert.equal("passwordHash" in safe, false);
  assert.equal(safe.name, "Andi");
});
