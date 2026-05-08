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
