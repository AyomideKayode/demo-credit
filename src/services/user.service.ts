// src/services/user.service.ts

import jwt from 'jsonwebtoken';
import db from '../config/database';
import { env } from '../config/env';
import { UserRepository } from '../repositories/user.repository';
import { WalletRepository } from '../repositories/wallet.repository';
import { KarmaService } from './karma.service';
import { AppError, CreateUserDto, User, Wallet } from '../types';
import { generateId } from '../utils/helpers';

export class UserService {
  private userRepo = new UserRepository();
  private walletRepo = new WalletRepository();
  private karmaService = new KarmaService();

  async register(dto: CreateUserDto): Promise<{ user: User; token: string }> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new AppError(409, 'A user with this email already exists');
    }

    const isBlacklisted = await this.karmaService.isBlacklisted(dto.email);
    if (isBlacklisted) {
      throw new AppError(403, 'User is not eligible for onboarding');
    }

    const userId = generateId();
    const walletId = generateId();

    const user: User = {
      id: userId,
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      phone_number: dto.phone_number,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const wallet: Wallet = {
      id: walletId,
      user_id: userId,
      balance: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.transaction(async (trx) => {
      await this.userRepo.create(user, trx);
      await this.walletRepo.create(wallet, trx);
    });

    const token = jwt.sign({ id: userId }, env.JWT_SECRET, {
      expiresIn: '24h',
    });

    return { user, token };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    return user;
  }
}
