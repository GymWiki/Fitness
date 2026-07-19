import * as Crypto from 'expo-crypto';

/** Client-generated primary keys, so offline-created rows can be retried idempotently (upsert on id). */
export function generateId(): string {
  return Crypto.randomUUID();
}
