// src/controllers/wallet.controller.ts

import { Request, Response } from 'express';
import { z } from 'zod';
import { WalletService } from '../services/wallet.service';
import { AppError } from '../types';
import { successResponse, errorResponse } from '../utils/helpers';

const fundSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
});

const transferSchema = z.object({
  receiver_id: z.string().uuid('Invalid receiver ID'),
  amount: z.number().positive('Amount must be greater than zero'),
});

const withdrawSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero'),
});

export class WalletController {
  private walletService = new WalletService();

  getWallet = async (req: Request, res: Response): Promise<void> => {
    try {
      const wallet = await this.walletService.getWallet(req.user!.id);
      res.json(successResponse('Wallet retrieved successfully', wallet));
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.status).json(errorResponse(err.message));
        return;
      }
      res.status(500).json(errorResponse('An unexpected error occurred'));
    }
  };

  fund = async (req: Request, res: Response): Promise<void> => {
    const result = fundSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(errorResponse(result.error.issues[0].message));
      return;
    }

    try {
      const wallet = await this.walletService.fund(req.user!.id, result.data);
      res.json(successResponse('Wallet funded successfully', wallet));
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.status).json(errorResponse(err.message));
        return;
      }
      res.status(500).json(errorResponse('An unexpected error occurred'));
    }
  };

  transfer = async (req: Request, res: Response): Promise<void> => {
    const result = transferSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(errorResponse(result.error.issues[0].message));
      return;
    }

    try {
      const wallet = await this.walletService.transfer(req.user!.id, result.data);
      res.json(successResponse('Transfer successful', wallet));
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.status).json(errorResponse(err.message));
        return;
      }
      res.status(500).json(errorResponse('An unexpected error occurred'));
    }
  };

  withdraw = async (req: Request, res: Response): Promise<void> => {
    const result = withdrawSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(errorResponse(result.error.issues[0].message));
      return;
    }

    try {
      const wallet = await this.walletService.withdraw(req.user!.id, result.data);
      res.json(successResponse('Withdrawal successful', wallet));
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.status).json(errorResponse(err.message));
        return;
      }
      res.status(500).json(errorResponse('An unexpected error occurred'));
    }
  };
}
