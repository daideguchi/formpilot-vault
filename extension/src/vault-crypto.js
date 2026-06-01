import { normalizeVaultState } from "./profile-memory.js";

export const VAULT_CRYPTO_STORAGE_KEY = "vaultCrypto";
export const VAULT_ENCRYPTION_VERSION = 1;

const AES_ALGORITHM = "AES-GCM";
const IV_BYTES = 12;
const KEY_BYTES = 32;

export async function loadRuntimeVaultState(rawVaultState, { storage, profile = {}, now = new Date() } = {}) {
  const state = normalizeVaultState(rawVaultState, { profile, now });

  for (const record of state.vault_profiles) {
    if (record.encrypted_values && !record.values) {
      record.values = await decryptJson(record.encrypted_values, { storage });
    }
  }

  return state;
}

export async function serializeVaultStateForStorage(vaultState, { storage } = {}) {
  const state = normalizeVaultState(vaultState);
  const output = clone(state);

  for (const record of output.vault_profiles) {
    const values = clone(record.values || {});
    record.encrypted_values = await encryptJson(values, { storage });
    record.encryption = {
      version: VAULT_ENCRYPTION_VERSION,
      alg: AES_ALGORITHM,
      scope: "device_local"
    };
    delete record.values;
  }

  return output;
}

export async function persistVaultState(storage, vaultState) {
  const encrypted = await serializeVaultStateForStorage(vaultState, { storage });
  await storageSet(storage, { vaultState: encrypted });
  return encrypted;
}

export async function encryptJson(value, { storage } = {}) {
  const key = await getOrCreateAesKey(storage);
  const iv = randomBytes(IV_BYTES);
  const encoded = new TextEncoder().encode(JSON.stringify(value ?? {}));
  const ciphertext = await globalThis.crypto.subtle.encrypt({ name: AES_ALGORITHM, iv }, key, encoded);

  return {
    version: VAULT_ENCRYPTION_VERSION,
    alg: AES_ALGORITHM,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext))
  };
}

export async function decryptJson(payload, { storage } = {}) {
  if (!payload || payload.alg !== AES_ALGORITHM || !payload.iv || !payload.ciphertext) {
    throw new Error("Invalid encrypted Vault payload");
  }

  const key = await getOrCreateAesKey(storage);
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

export function storageDumpContainsProfileValues(storageDump, profile) {
  const dump = JSON.stringify(storageDump);
  const candidates = collectStrings(profile)
    .filter((value) => value.length >= 4)
    .filter((value) => !/^https?:\/\//i.test(value));
  return candidates.some((value) => dump.includes(value));
}

async function getOrCreateAesKey(storage) {
  const stored = await storageGet(storage, [VAULT_CRYPTO_STORAGE_KEY]);
  const existing = stored?.[VAULT_CRYPTO_STORAGE_KEY]?.key_b64;
  const keyBytes = existing ? base64ToBytes(existing) : randomBytes(KEY_BYTES);

  if (!existing) {
    await storageSet(storage, {
      [VAULT_CRYPTO_STORAGE_KEY]: {
        version: VAULT_ENCRYPTION_VERSION,
        alg: AES_ALGORITHM,
        key_b64: bytesToBase64(keyBytes),
        created_at: new Date().toISOString()
      }
    });
  }

  return globalThis.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: AES_ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

async function storageGet(storage, keys) {
  if (!storage?.get) return {};
  return storage.get(keys);
}

async function storageSet(storage, values) {
  if (!storage?.set) return;
  await storage.set(values);
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"));
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap((entry) => collectStrings(entry));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}
