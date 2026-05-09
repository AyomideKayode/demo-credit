# demo-credit

## Planned Repo Structure

```sh
demo-credit/
├── src/
│   ├── config/
│   │   ├── database.ts       # Knex singleton
│   │   └── env.ts            # env validation + export
│   ├── controllers/
│   │   ├── user.controller.ts
│   │   └── wallet.controller.ts
│   ├── services/
│   │   ├── user.service.ts
│   │   ├── wallet.service.ts
│   │   └── karma.service.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   └── wallet.repository.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── user.routes.ts
│   │   └── wallet.routes.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── app.ts
├── db/
│   └── migrations/
├── tests/
│   ├── user.test.ts
│   └── wallet.test.ts
├── .env.example
├── .gitignore
├── knexfile.ts
├── tsconfig.json
└── package.json
```

### Notes

- Transactions retain `updated_at` because status transitions from `PENDING` to `SUCCESS` or `FAILED` require mutation, while preserving immutable financial history through separate transaction records.
- **Financial Integrity**: By setting `ON DELETE RESTRICT`, we are ensuring that a user or wallet cannot be removed if there is a paper trail of transactions associated with them. This is a non-negotiable requirement in fintech systems.
- **Performance**: The `BTREE` indexes on the `sender` and `receiver` IDs ensure that as our `transactions` table grows into the millions, the "Transaction History" query for an individual user remains $O(\log n)$ rather than $O(n)$.
- **Auditability**: The use of `updated_at` on a ledger should be a smart compromise. In the design doc, I can frame this as: "While the ledger is logically append-only, the `status` and `updated_at` fields allow for atomic state transitions (e.g., fulfilling a PENDING transaction) while maintaining a timestamped audit trail of when the finality occurred."

### Migration Process

- Create migration files

```sh
~/sandbox/demo-credit on  feat/migrations !  via  v20.20.0 is 󰏗 v1.0.0
❯ npx knex --knexfile knexfile.ts migrate:make create_users_table
Requiring external module ts-node/register
◇ injected env (9) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
Using environment: development
Using environment: development
Using environment: development
Created Migration: /home/ayomide/sandbox/demo-credit/db/migrations/20260508105239_create_users_table.ts

~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0 7s
❯ npx knex --knexfile knexfile.ts migrate:make create_wallets_table
Requiring external module ts-node/register
◇ injected env (9) from .env // tip: ⌁ auth for agents [www.vestauth.com]
Using environment: development
Using environment: development
Using environment: development
Created Migration: /home/ayomide/sandbox/demo-credit/db/migrations/20260508105309_create_wallets_table.ts

~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0 4s
❯ npx knex --knexfile knexfile.ts migrate:make create_transactions_table
Requiring external module ts-node/register
◇ injected env (9) from .env // tip: ◈ encrypted .env [www.dotenvx.com]
Using environment: development
Using environment: development
Using environment: development
Created Migration: /home/ayomide/sandbox/demo-credit/db/migrations/20260508105326_create_transactions_table.ts

~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0 3s
❯ ls db/migrations/
20260508105239_create_users_table.ts
20260508105309_create_wallets_table.ts
20260508105326_create_transactions_table.ts
```

- Run Migration Script and verify in MySQL after writing the migration code in previously created files

```sh
~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0
❯ npm run migrate

> demo-credit@1.0.0 migrate
> knex --knexfile knexfile.ts migrate:latest

Requiring external module ts-node/register
◇ injected env (9) from .env // tip: ⌘ override existing { override: true }
Using environment: development
Batch 1 run: 3 migrations

~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0 10s
❯ mysql -u root -p demo_credit -e "SHOW TABLES;"
Enter password:
+-----------------------+
| Tables_in_demo_credit |
+-----------------------+
| knex_migrations       |
| knex_migrations_lock  |
| transactions          |
| users                 |
| wallets               |
+-----------------------+

~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0 7s
❯ mysql -u root -p demo_credit -e "DESCRIBE users;"
Enter password:
+--------------+--------------+------+-----+-------------------+-----------------------------------------------+
| Field        | Type         | Null | Key | Default           | Extra                                         |
+--------------+--------------+------+-----+-------------------+-----------------------------------------------+
| id           | char(36)     | NO   | PRI | NULL              |                                               |
| first_name   | varchar(255) | NO   |     | NULL              |                                               |
| last_name    | varchar(255) | NO   |     | NULL              |                                               |
| email        | varchar(255) | NO   | UNI | NULL              |                                               |
| phone_number | varchar(255) | NO   | UNI | NULL              |                                               |
| created_at   | timestamp    | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
| updated_at   | timestamp    | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
+--------------+--------------+------+-----+-------------------+-----------------------------------------------+

~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0 9s
❯ mysql -u root -p demo_credit -e "DESCRIBE wallets;"
Enter password:
+------------+---------------+------+-----+-------------------+-----------------------------------------------+
| Field      | Type          | Null | Key | Default           | Extra                                         |
+------------+---------------+------+-----+-------------------+-----------------------------------------------+
| id         | char(36)      | NO   | PRI | NULL              |                                               |
| user_id    | char(36)      | NO   | UNI | NULL              |                                               |
| balance    | decimal(20,2) | NO   |     | 0.00              |                                               |
| created_at | timestamp     | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
| updated_at | timestamp     | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
+------------+---------------+------+-----+-------------------+-----------------------------------------------+

~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0 5s
❯ mysql -u root -p demo_credit -e "DESCRIBE transactions;"
Enter password:
+--------------------+--------------------------------------+------+-----+-------------------+-----------------------------------------------+
| Field              | Type                                 | Null | Key | Default           | Extra                                         |
+--------------------+--------------------------------------+------+-----+-------------------+-----------------------------------------------+
| id                 | char(36)                             | NO   | PRI | NULL              |                                               |
| reference          | varchar(255)                         | NO   | UNI | NULL              |                                               |
| type               | enum('FUND','TRANSFER','WITHDRAWAL') | NO   |     | NULL              |                                               |
| amount             | decimal(20,2)                        | NO   |     | NULL              |                                               |
| sender_wallet_id   | char(36)                             | YES  | MUL | NULL              |                                               |
| receiver_wallet_id | char(36)                             | YES  | MUL | NULL              |                                               |
| status             | enum('PENDING','SUCCESS','FAILED')   | NO   |     | NULL              |                                               |
| created_at         | timestamp                            | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED                             |
| updated_at         | timestamp                            | NO   |     | CURRENT_TIMESTAMP | DEFAULT_GENERATED on update CURRENT_TIMESTAMP |
+--------------------+--------------------------------------+------+-----+-------------------+-----------------------------------------------+

~/sandbox/demo-credit on  feat/migrations !?  via  v20.20.0 is 󰏗 v1.0.0 7s
❯
```

### Repository

- Used `findByIdForUpdate` inside the [Wallet Repository](/src/repositories/wallet.repository.ts) file as it only makes sense inside a Knex transaction — calling it outside one won't acquire a lock because there's no transaction context to hold it. The service layer will always call it with a `trx` argument. That's enforced by the method signature.

- `create` on `WalletRepository` takes a mandatory `trx` argument because wallet creation always happens inside the same transaction as user creation — we never create a user without immediately creating their wallet atomically. There's no valid use case for creating a wallet outside a transaction.

- `createTransaction` lives in `WalletRepository`, not a separate repository, because transactions are always created as part of a wallet operation. They're never created standalone.

- In order to avoid relying on `decimal.js` in this MVP and to address the float precision issue, a purposeful trade-off was made to include rounding at the database boundary.
