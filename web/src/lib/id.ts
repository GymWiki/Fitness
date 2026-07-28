/** Client-generated primary keys, so retried writes stay idempotent (upsert on id). */
export function generateId(): string {
  return crypto.randomUUID();
}
