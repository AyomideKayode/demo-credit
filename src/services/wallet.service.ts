// src/services/wallet.service.ts

import db from '../config/database';
import { UserRepository } from '../repositories/user.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { AppError, FundWalletDto, TransferDto, Wallet, WithdrawDto } from '../types';
import { generateId, generateReference } from '../utils/helpers';

export class WalletService {
  private walletRepo = new WalletRepository();
  private userRepo = new UserRepository();

  async getWallet(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findByUserId(userId);
    if (!wallet) {
      throw new AppError(404, 'Wallet not found');
    }
    return wallet;
  }

  async fund(userId: string, dto: FundWalletDto): Promise<Wallet> {
    if (dto.amount <= 0) {
      throw new AppError(400, 'Amount must be greater than zero');
    }

    return db.transaction(async (trx) => {
      const wallet = await this.walletRepo.findByIdForUpdate(
        (await this.walletRepo.findByUserId(userId))?.id ?? '',
        trx,
      );

      if (!wallet) {
        throw new AppError(404, 'Wallet not found');
      }

      const newBalance = wallet.balance + dto.amount;

      await this.walletRepo.updateBalance(wallet.id, newBalance, trx);
      await this.walletRepo.createTransaction(
        {
          id: generateId(),
          reference: generateReference(),
          type: 'FUND',
          amount: dto.amount,
          sender_wallet_id: null,
          receiver_wallet_id: wallet.id,
          status: 'SUCCESS',
          created_at: new Date(),
          updated_at: new Date(),
        },
        trx,
      );

      return { ...wallet, balance: newBalance };
    });
  }

  async transfer(senderId: string, dto: TransferDto): Promise<Wallet> {
    if (dto.amount <= 0) {
      throw new AppError(400, 'Amount must be greater than zero');
    }

    if (senderId === dto.receiver_id) {
      throw new AppError(400, 'Cannot transfer funds to yourself');
    }

    const receiver = await this.userRepo.findById(dto.receiver_id);
    if (!receiver) {
      throw new AppError(404, 'Receiver not found');
    }

    const senderWalletRaw = await this.walletRepo.findByUserId(senderId);
    const receiverWalletRaw = await this.walletRepo.findByUserId(dto.receiver_id);

    if (!senderWalletRaw) throw new AppError(404, 'Sender wallet not found');
    if (!receiverWalletRaw) throw new AppError(404, 'Receiver wallet not found');

    return db.transaction(async (trx) => {
      // Always lock in consistent ID order to prevent deadlocks
      const [firstId, secondId] = [senderWalletRaw.id, receiverWalletRaw.id].sort();
      const firstWallet = await this.walletRepo.findByIdForUpdate(firstId, trx);
      const secondWallet = await this.walletRepo.findByIdForUpdate(secondId, trx);

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

      const newSenderBalance = senderWallet.balance - dto.amount;
      const newReceiverBalance = receiverWallet.balance + dto.amount;

      await this.walletRepo.updateBalance(senderWallet.id, newSenderBalance, trx);
      await this.walletRepo.updateBalance(receiverWallet.id, newReceiverBalance, trx);
      await this.walletRepo.createTransaction(
        {
          id: generateId(),
          reference: generateReference(),
          type: 'TRANSFER',
          amount: dto.amount,
          sender_wallet_id: senderWallet.id,
          receiver_wallet_id: receiverWallet.id,
          status: 'SUCCESS',
          created_at: new Date(),
          updated_at: new Date(),
        },
        trx,
      );

      return { ...senderWallet, balance: newSenderBalance };
    });
  }

  async withdraw(userId: string, dto: WithdrawDto): Promise<Wallet> {
    if (dto.amount <= 0) {
      throw new AppError(400, 'Amount must be greater than zero');
    }

    return db.transaction(async (trx) => {
      const walletRaw = await this.walletRepo.findByUserId(userId);
      if (!walletRaw) throw new AppError(404, 'Wallet not found');

      const wallet = await this.walletRepo.findByIdForUpdate(walletRaw.id, trx);
      if (!wallet) throw new AppError(404, 'Wallet not found');

      if (wallet.balance < dto.amount) {
        throw new AppError(400, 'Insufficient balance');
      }

      const newBalance = wallet.balance - dto.amount;

      await this.walletRepo.updateBalance(wallet.id, newBalance, trx);
      await this.walletRepo.createTransaction(
        {
          id: generateId(),
          reference: generateReference(),
          type: 'WITHDRAWAL',
          amount: dto.amount,
          sender_wallet_id: wallet.id,
          receiver_wallet_id: null,
          status: 'SUCCESS',
          created_at: new Date(),
          updated_at: new Date(),
        },
        trx,
      );

      return { ...wallet, balance: newBalance };
    });
  }
}
