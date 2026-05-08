// db/migrations/20260508105326_create_transactions_table.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transactions', (table) => {
    table.uuid('id').primary();
    table.string('reference').notNullable().unique();
    table.enum('type', ['FUND', 'TRANSFER', 'WITHDRAWAL']).notNullable();
    table.decimal('amount', 20, 2).notNullable().checkPositive();
    table.uuid('sender_wallet_id').nullable();
    table.uuid('receiver_wallet_id').nullable();
    table.enum('status', ['PENDING', 'SUCCESS', 'FAILED']).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table
      .timestamp('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    table
      .foreign('sender_wallet_id')
      .references('id')
      .inTable('wallets')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');

    table
      .foreign('receiver_wallet_id')
      .references('id')
      .inTable('wallets')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');

    table.index('sender_wallet_id', 'idx_transactions_sender');
    table.index('receiver_wallet_id', 'idx_transactions_receiver');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('transactions');
}
