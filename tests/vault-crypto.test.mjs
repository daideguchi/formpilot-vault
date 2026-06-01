import test from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_PROFILE } from "../extension/src/profile-formatters.js";
import { createVaultState, getActiveProfileValues } from "../extension/src/profile-memory.js";
import {
  VAULT_CRYPTO_STORAGE_KEY,
  loadRuntimeVaultState,
  persistVaultState,
  serializeVaultStateForStorage,
  storageDumpContainsProfileValues
} from "../extension/src/vault-crypto.js";

test("encrypts profile values at rest and restores them at runtime", async () => {
  const storage = new MemoryStorage();
  const vaultState = createVaultState({ profile: SAMPLE_PROFILE, now: new Date("2026-06-01T00:00:00Z") });
  const encrypted = await serializeVaultStateForStorage(vaultState, { storage });

  assert.equal(encrypted.vault_profiles[0].values, undefined);
  assert.equal(encrypted.vault_profiles[0].encrypted_values.alg, "AES-GCM");
  assert.ok(storage.data[VAULT_CRYPTO_STORAGE_KEY].key_b64);
  assert.equal(storageDumpContainsProfileValues({ vaultState: encrypted }, SAMPLE_PROFILE), false);

  const restored = await loadRuntimeVaultState(encrypted, { storage });
  assert.deepEqual(getActiveProfileValues(restored), SAMPLE_PROFILE);
});

test("migrates legacy plaintext Vault storage into encrypted storage", async () => {
  const storage = new MemoryStorage();
  const legacy = createVaultState({ profile: SAMPLE_PROFILE, now: new Date("2026-06-01T00:00:00Z") });
  storage.data.vaultState = legacy;

  assert.equal(storageDumpContainsProfileValues(storage.data, SAMPLE_PROFILE), true);
  const runtimeState = await loadRuntimeVaultState(storage.data.vaultState, { storage, profile: SAMPLE_PROFILE });
  await persistVaultState(storage, runtimeState);

  assert.equal(storage.data.vaultState.vault_profiles[0].values, undefined);
  assert.equal(storage.data.vaultState.vault_profiles[0].encrypted_values.alg, "AES-GCM");
  assert.equal(storageDumpContainsProfileValues(storage.data, SAMPLE_PROFILE), false);
  assert.deepEqual(getActiveProfileValues(await loadRuntimeVaultState(storage.data.vaultState, { storage })), SAMPLE_PROFILE);
});

class MemoryStorage {
  data = {};

  async get(keys) {
    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, this.data[key]]));
    }
    if (typeof keys === "string") return { [keys]: this.data[keys] };
    return { ...this.data };
  }

  async set(values) {
    this.data = { ...this.data, ...values };
  }

  async remove(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) delete this.data[key];
  }
}
