// src/services/wallet.service.ts

import db from '../config/database';
import { UserRepository } from '../repositories/user.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import {
  AppError,
  FundWalletDto,
  TransferDto,
  Wallet,
  WithdrawDto,
} from '../types';
import { generateId, generateReference } from '../utils/helpers';

export class WalletService {
  private walletRepo = new WalletRepository();
  private userRepo = new UserRepository();

  // Helper to check if a number has at most 2 decimal places (cent precision)
  private hasCentPrecision(amount: number): boolean {
    return Math.round(amount * 100) / 100 === amount;
  }

  private validateAmount(amount: number): void {
    if (amount <= 0 || !this.hasCentPrecision(amount)) {
      throw new AppError(
        400,
        'Amount must be a positive number with at most 2 decimal places',
      );
    }
  }

  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
      throw new AppError(404, 'Wallet not found');
    }
    return wallet;
  }

  async fund(userId: string, dto: FundWalletDto): Promise<Wallet> {
    this.validateAmount(dto.amount);

    const walletRaw = await this.walletRepo.findByUserId(userId);
    if (!walletRaw) throw new AppError(404, 'Wallet not found');

    return db.transaction(async (trx) => {
      const wallet = await this.walletRepo.findByIdForUpdate(walletRaw.id, trx);
      if (!wallet) throw new AppError(404, 'Wallet not found');

      const txId = generateId();

      await this.walletRepo.createTransaction(
        {
          id: txId,
          reference: generateReference(),
          type: 'FUND',
          amount: dto.amount,
          sender_wallet_id: null,
          receiver_wallet_id: wallet.id,
          status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date(),
        },
        trx,
      );

      const newBalance = wallet.balance + dto.amount;
      await this.walletRepo.updateBalance(wallet.id, newBalance, trx);
      await this.walletRepo.updateTransactionStatus(txId, 'SUCCESS', trx);

      const updated = await this.walletRepo.findByIdForUpdate(wallet.id, trx);
      if (!updated) throw new AppError(404, 'Wallet not found');
      return updated;
    });
  }

  async transfer(senderId: string, dto: TransferDto): Promise<Wallet> {
    this.validateAmount(dto.amount);

    if (senderId === dto.receiver_id) {
      throw new AppError(400, 'Cannot transfer funds to yourself');
    }

    const receiver = await this.userRepo.findById(dto.receiver_id);
    if (!receiver) {
      throw new AppError(404, 'Receiver not found');
    }

    const senderWalletRaw = await this.walletRepo.findByUserId(senderId);
    const receiverWalletRaw = await this.walletRepo.findByUserId(
      dto.receiver_id,
    );

    if (!senderWalletRaw) throw new AppError(404, 'Sender wallet not found');
    if (!receiverWalletRaw)
      throw new AppError(404, 'Receiver wallet not found');

    return db.transaction(async (trx) => {
      // Lock in consistent ID order to prevent deadlocks on concurrent
      // opposing transfers between the same two wallets
      const [firstId, secondId] = [
        senderWalletRaw.id,
        receiverWalletRaw.id,
      ].sort();
      const firstWallet = await this.walletRepo.findByIdForUpdate(firstId, trx);
      const secondWallet = await this.walletRepo.findByIdForUpdate(
        secondId,
        trx,
      );

      if (!firstWallet || !secondWallet) {
        throw new AppError(404, 'Wallet not found');
      }

      const senderWallet =
        firstWallet.id === senderWalletRaw.id ? firstWallet : secondWallet;
      const receiverWallet =
        firstWallet.id === receiverWalletRaw.id ? firstWallet : secondWallet;

      if (senderWallet.balance < dto.amount) {
        throw new AppError(400, 'Insufficient balance');
      }

      const txId = generateId();

      await this.walletRepo.createTransaction(
        {
          id: txId,
          reference: generateReference(),
          type: 'TRANSFER',
          amount: dto.amount,
          sender_wallet_id: senderWallet.id,
          receiver_wallet_id: receiverWallet.id,
          status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date(),
        },
        trx,
      );

      const newSenderBalance = senderWallet.balance - dto.amount;
      const newReceiverBalance = receiverWallet.balance + dto.amount;

      await this.walletRepo.updateBalance(
        senderWallet.id,
        newSenderBalance,
        trx,
      );
      await this.walletRepo.updateBalance(
        receiverWallet.id,
        newReceiverBalance,
        trx,
      );
      await this.walletRepo.updateTransactionStatus(txId, 'SUCCESS', trx);

      const updated = await this.walletRepo.findByIdForUpdate(
        senderWallet.id,
        trx,
      );
      if (!updated) throw new AppError(404, 'Wallet not found');
      return updated;
    });
  }

  async withdraw(userId: string, dto: WithdrawDto): Promise<Wallet> {
    this.validateAmount(dto.amount);

    const walletRaw = await this.walletRepo.findByUserId(userId);
    if (!walletRaw) throw new AppError(404, 'Wallet not found');

    return db.transaction(async (trx) => {
      const wallet = await this.walletRepo.findByIdForUpdate(walletRaw.id, trx);
      if (!wallet) throw new AppError(404, 'Wallet not found');

      if (wallet.balance < dto.amount) {
        throw new AppError(400, 'Insufficient balance');
      }

      const txId = generateId();

      await this.walletRepo.createTransaction(
        {
          id: txId,
          reference: generateReference(),
          type: 'WITHDRAWAL',
          amount: dto.amount,
          sender_wallet_id: wallet.id,
          receiver_wallet_id: null,
          status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date(),
        },
        trx,
      );

      const newBalance = wallet.balance - dto.amount;
      await this.walletRepo.updateBalance(wallet.id, newBalance, trx);
      await this.walletRepo.updateTransactionStatus(txId, 'SUCCESS', trx);

      const updated = await this.walletRepo.findByIdForUpdate(wallet.id, trx);
      if (!updated) throw new AppError(404, 'Wallet not found');
      return updated;
    });
  }
}
