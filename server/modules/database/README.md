# Database Module Boundaries

`db.js` owns environment loading, MySQL pool creation, identifier quoting, and the low-level `query(sql, params)` helper.

Feature modules should not create pools directly. They receive `query` for single statements and `getPool` only when they need an explicit connection or transaction.

`server/modules/database/connection.js` owns connection lifetime helpers:

- `withDatabaseConnection(getPool, handler)` acquires and always releases a connection.
- `withDatabaseTransaction(getPool, handler)` wraps a handler with begin/commit/rollback.

Schema bootstrap order is:

1. Run `db/schema.sql` as the baseline schema.
2. Apply school scoping columns and settings migrations.
3. Apply PDF template, PDF generation history, and PDF generation batch migrations.
4. Apply candidate record migrations.
5. Apply admin account migrations.
6. Backfill rows that need a default school scope.

Repositories own SQL shape and row mapping for their feature. Services own validation, permission-independent business rules, and transaction orchestration.
