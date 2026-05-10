// src/repositories/wallet.repository.ts

import { Knex } from 'knex';
import db from '../config/database';
import { Transaction, TransactionStatus, Wallet } from '../types';

export class WalletRepository {
  // mysql2 returns DECIMAL columns as strings over the wire.
  // Normalize balance to number before returning to the service layer.
  private normalize(wallet: Wallet): Wallet {
    return {
      ...wallet,
      balance: Number(
        parseFloat(wallet.balance as unknown as string).toFixed(2),
      ),
    };
  }

  async findByUserId(userId: string): Promise<Wallet | undefined> {
    const wallet = await db<Wallet>('wallets')
      .where({ user_id: userId })
      .first();
    return wallet ? this.normalize(wallet) : undefined;
  }

  async findById(id: string): Promise<Wallet | undefined> {
    const wallet = await db<Wallet>('wallets').where({ id }).first();
    return wallet ? this.normalize(wallet) : undefined;
  }

  // Used inside Knex transactions to acquire a row-level lock
  // before any balance mutation. Prevents concurrent double-spends.
  async findByIdForUpdate(
    id: string,
    trx: Knex.Transaction,
  ): Promise<Wallet | undefined> {
    const wallet = await trx<Wallet>('wallets')
      .where({ id })
      .forUpdate()
      .first();
    return wallet ? this.normalize(wallet) : undefined;
  }

  async create(wallet: Wallet, trx: Knex.Transaction): Promise<void> {
    await trx<Wallet>('wallets').insert(wallet);
  }

  async updateBalance(
    walletId: string,
    balance: number,
    trx: Knex.Transaction,
  ): Promise<void> {
    await trx<Wallet>('wallets')
      .where({ id: walletId })
      .update({ balance: Number(balance.toFixed(2)), updated_at: new Date() });
  }

  async createTransaction(
    transaction: Transaction,
    trx: Knex.Transaction,
  ): Promise<void> {
    await trx<Transaction>('transactions').insert(transaction);
  }

  // add a method to update transaction status (for pending transactions)
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    trx: Knex.Transaction,
  ): Promise<void> {
    await trx<Transaction>('transactions')
      .where({ id: transactionId })
      .update({ status, updated_at: new Date() });
  }
}
