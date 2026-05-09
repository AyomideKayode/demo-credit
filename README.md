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

### User Module - user creation

- Had to add an `env` flag that bypasses Karma in development due to issues I was having with the Adjutor Test/Live mode toggle. This resulted in my smoke test returning user creation and eligibility issues

```sh
~/sandbox/demo-credit on  feat/user-module !+?  via  v20.20.0 is 󰏗 v1.0.0
❯ curl -s -X POST http://localhost:3000/api/v1/users   -H "Content-Type: application/json"   -d '{
    "first_name": "Ayomide",
    "last_name": "Kayode",
    "email": "ayomide.smoketest.01@gmail.com",
    "phone_number": "08012345678"
  }' | jq
{
  "status": "error",
  "message": "User is not eligible for onboarding"
}
```

- This lets me complete and smoke test the rest of the implementation without being blocked. In production (`NODE_ENV=production`), the bypass is never active. The real Karma check runs. I'm using this not necessarily as a hack, just normal development pattern.

```sh
~/sandbox/demo-credit on  feat/user-module !+?  via  v20.20.0 is 󰏗 v1.0.0 3s
❯ curl -s -X POST http://localhost:3000/api/v1/users   -H "Content-Type: application/json"   -d '{
    "first_name": "Ayomide",
    "last_name": "Kayode",
    "email": "ayomide.smoketest.01@gmail.com",
    "phone_number": "08012345678"
  }' | jq
{
  "status": "success",
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "59a5d16c-311e-4497-a180-d0d0995ebb07",
      "first_name": "Ayomide",
      "last_name": "Kayode",
      "email": "ayomide.smoketest.01@gmail.com",
      "phone_number": "08012345678",
      "created_at": "2026-05-09T11:40:17.938Z",
      "updated_at": "2026-05-09T11:40:17.938Z"
    },
    "token": "<REDACTED_JWT>"
  }
}
```

### Wallet Module - testing wallet endpoints after creating files

- For the transfers, I made sure wallets are always locked in ascending ID order regardless of who is sender and receiver. This prevents deadlocks when two concurrent transfers involve the same two wallets in opposite directions — both requests acquire locks in the same order, so neither can deadlock waiting on the other.

- After creating the three wallet files and updating the routes index, ran a smoke test on all four wallet endpoints.

```sh
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0 5s
❯ TOKEN="eyJhbGci...<REDACTED_JWT_FROM_INITIALLY_CREATED_USER>"

# Get wallet
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ curl -s http://localhost:3000/api/v1/wallets/me \
  -H "Authorization: Bearer $TOKEN" | jq
{
  "status": "success",
  "message": "Wallet retrieved successfully",
  "data": {
    "id": "3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e",
    "user_id": "59a5d16c-311e-4497-a180-d0d0995ebb07",
    "balance": 0,
    "created_at": "2026-05-09T11:40:18.000Z",
    "updated_at": "2026-05-09T11:40:18.000Z"
  }
}

# Fund
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ curl -s -X POST http://localhost:3000/api/v1/wallets/fund \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}' | jq
{
  "status": "success",
  "message": "Wallet funded successfully",
  "data": {
    "id": "3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e",
    "user_id": "59a5d16c-311e-4497-a180-d0d0995ebb07",
    "balance": 5000,
    "created_at": "2026-05-09T11:40:18.000Z",
    "updated_at": "2026-05-09T11:40:18.000Z"
  }
}

# Withdraw
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ curl -s -X POST http://localhost:3000/api/v1/wallets/withdraw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}' | jq
{
  "status": "success",
  "message": "Withdrawal successful",
  "data": {
    "id": "3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e",
    "user_id": "59a5d16c-311e-4497-a180-d0d0995ebb07",
    "balance": 4000,
    "created_at": "2026-05-09T11:40:18.000Z",
    "updated_at": "2026-05-09T18:02:21.000Z"
  }
}

```

- To test the transfer endpoint, I created another user and then use their `id` as the `receiver_id`.

```sh
# Create new user
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ curl -s -X POST http://localhost:3000/api/v1/users   -H "Content-Type: application/json"   -d '{
    "first_name": "Eseose",
    "last_name": "Lendsqr",
    "email": "eseose.smoketest.02@gmail.com",
    "phone_number": "09012345678"
  }' | jq
{
  "status": "success",
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "b64e3d89-383a-43eb-a402-c089e1cb5568",
      "first_name": "Eseose",
      "last_name": "Lendsqr",
      "email": "eseose.smoketest.02@gmail.com",
      "phone_number": "09012345678",
      "created_at": "2026-05-09T18:18:32.753Z",
      "updated_at": "2026-05-09T18:18:32.753Z"
    },
    "token": "eyJhbGci...<REDACTED_JWT>"
  }
}

# Transfer funds from Ayomide to Eseose
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ curl -s -X POST http://localhost:3000/api/v1/wallets/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": "b64e3d89-383a-43eb-a402-c089e1cb5568",
    "amount": 1500
  }' | jq
{
  "status": "success",
  "message": "Transfer successful",
  "data": {
    "id": "3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e",
    "user_id": "59a5d16c-311e-4497-a180-d0d0995ebb07",
    "balance": 2500,
    "created_at": "2026-05-09T11:40:18.000Z",
    "updated_at": "2026-05-09T18:02:46.000Z"
  }
}

```

- Verify funds was received by Eseose

```sh
# Change Token
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ TOKEN="eyJhbGci...<REDACTED_JWT_FOR_SECOND_USER>"

# Get Wallet
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ curl -s http://localhost:3000/api/v1/wallets/me   -H "Authorization: Bearer $TOKEN" | jq
{
  "status": "success",
  "message": "Wallet retrieved successfully",
  "data": {
    "id": "da3ee036-32b7-417f-a4b1-1df0b32cb628",
    "user_id": "b64e3d89-383a-43eb-a402-c089e1cb5568",
    "balance": 1500,
    "created_at": "2026-05-09T18:18:33.000Z",
    "updated_at": "2026-05-09T18:46:01.000Z"
  }
}

# Fund Wallet
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ curl -s -X POST http://localhost:3000/api/v1/wallets/fund \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}' | jq
{
  "status": "success",
  "message": "Wallet funded successfully",
  "data": {
    "id": "da3ee036-32b7-417f-a4b1-1df0b32cb628",
    "user_id": "b64e3d89-383a-43eb-a402-c089e1cb5568",
    "balance": 2500,
    "created_at": "2026-05-09T18:18:33.000Z",
    "updated_at": "2026-05-09T18:46:01.000Z"
  }
}

~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯
```

- Verifying transaction table directly from MySQL

```sh
~/sandbox/demo-credit on  feat/wallet-module !?  via  v20.20.0 is 󰏗 v1.0.0
❯ mysql -u root -p demo_credit
Enter password:
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 28
Server version: 8.0.45-0ubuntu0.24.04.1 (Ubuntu)

Copyright (c) 2000, 2026, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> SELECT id, reference, type, amount, sender_wallet_id, receiver_wallet_id, status, created_at FROM transactions ORDER BY created_at DESC;
+--------------------------------------+--------------------+------------+---------+--------------------------------------+--------------------------------------+---------+---------------------+
| id                                   | reference          | type       | amount  | sender_wallet_id                     | receiver_wallet_id                   | status  | created_at          |
+--------------------------------------+--------------------+------------+---------+--------------------------------------+--------------------------------------+---------+---------------------+
| 69a67685-567c-4ee7-a563-66bd5a245387 | DC-MOYPM84G-77R2II | FUND       | 1000.00 | NULL                                 | da3ee036-32b7-417f-a4b1-1df0b32cb628 | SUCCESS | 2026-05-09 20:01:04 |
| 0ca4210b-1946-44e7-9b2a-f359d02d1fc5 | DC-MOYP2VL5-O0VGYG | TRANSFER   | 1500.00 | 3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e | da3ee036-32b7-417f-a4b1-1df0b32cb628 | SUCCESS | 2026-05-09 19:46:01 |
| 262a1565-e0ca-4d06-87f1-1bda3e343576 | DC-MOYNJ9KI-SZPWBX | WITHDRAWAL | 1000.00 | 3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e | NULL                                 | SUCCESS | 2026-05-09 19:02:46 |
| aafc6e73-ae66-4dfb-96de-68e441d8496f | DC-MOYNIQ3A-R40SAB | FUND       | 5000.00 | NULL                                 | 3b4d5d5b-fb99-4e27-a40a-46cf3e9ca97e | SUCCESS | 2026-05-09 19:02:21 |
+--------------------------------------+--------------------+------------+---------+--------------------------------------+--------------------------------------+---------+---------------------+
4 rows in set (0.01 sec)

mysql>
```
