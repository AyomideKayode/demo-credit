// tests/wallet.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/database', () => ({
  default: { transaction: vi.fn() },
}));

vi.mock('../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-key',
    ADJUTOR_API_KEY: 'test-adjutor-key',
    SKIP_KARMA_CHECK: false,
    PORT: 3000,
    db: {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
      name: 'test',
    },
  },
}));

vi.mock('../src/repositories/wallet.repository');
vi.mock('../src/repositories/user.repository');

import { WalletService } from '../src/services/wallet.service';
import { WalletRepository } from '../src/repositories/wallet.repository';
import { UserRepository } from '../src/repositories/user.repository';
import db from '../src/config/database';
import { User, Wallet } from '../src/types';

// Wallet IDs chosen so SENDER sorts before RECEIVER alphabetically —
// this makes the lock-ordering in transfer() deterministic in tests.
const SENDER_USER_ID = 'sender-user-id';
const RECEIVER_USER_ID = 'receiver-user-id';
const SENDER_WALLET_ID = 'aaaa0000-0000-0000-0000-000000000001';
const RECEIVER_WALLET_ID = 'bbbb0000-0000-0000-0000-000000000002';

const mockSenderWallet: Wallet = {
  id: SENDER_WALLET_ID,
  user_id: SENDER_USER_ID,
  balance: 1000,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockReceiverWallet: Wallet = {
  id: RECEIVER_WALLET_ID,
  user_id: RECEIVER_USER_ID,
  balance: 500,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockReceiverUser: User = {
  id: RECEIVER_USER_ID,
  first_name: 'Receiver',
  last_name: 'User',
  email: 'receiver@example.com',
  phone_number: '09011223344',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

describe('WalletService', () => {
  let walletService: WalletService;
  let mockWalletRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockUserRepo: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWalletRepo = {
      findByUserId: vi.fn(),
      findById: vi.fn(),
      findByIdForUpdate: vi.fn(),
      create: vi.fn().mockResolvedValue(undefined),
      updateBalance: vi.fn().mockResolvedValue(undefined),
      createTransaction: vi.fn().mockResolvedValue(undefined),
      updateTransactionStatus: vi.fn().mockResolvedValue(undefined),
    };

    mockUserRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn().mockResolvedValue(undefined),
    };

    // vi.mocked(WalletRepository).mockImplementation(() => mockWalletRepo as any);
    // vi.mocked(UserRepository).mockImplementation(() => mockUserRepo as any);

    vi.mocked(WalletRepository).mockImplementation(function () {
      return mockWalletRepo as any;
    } as any);

    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as any;
    } as any);

    vi.mocked(db.transaction).mockImplementation(async (callback: any) =>
      callback({}),
    );

    walletService = new WalletService();
  });

  // ── getWallet ────────────────────────────────────────────────────────────────

  describe('getWallet', () => {
    it('returns the wallet for a valid user', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockSenderWallet);

      const wallet = await walletService.getWallet(SENDER_USER_ID);

      expect(wallet).toEqual(mockSenderWallet);
      expect(mockWalletRepo.findByUserId).toHaveBeenCalledWith(SENDER_USER_ID);
    });

    it('throws 404 when wallet does not exist', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(undefined);

      await expect(
        walletService.getWallet(SENDER_USER_ID),
      ).rejects.toMatchObject({ status: 404, message: 'Wallet not found' });
    });
  });

  // ── fund ─────────────────────────────────────────────────────────────────────

  describe('fund', () => {
    const fundedWallet: Wallet = { ...mockSenderWallet, balance: 1500 };

    it('increases wallet balance by the funded amount', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockSenderWallet);
      mockWalletRepo.findByIdForUpdate
        .mockResolvedValueOnce(mockSenderWallet)
        .mockResolvedValueOnce(fundedWallet);

      const result = await walletService.fund(SENDER_USER_ID, { amount: 500 });

      expect(result.balance).toBe(1500);
      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        SENDER_WALLET_ID,
        1500,
        {},
      );
    });

    it('creates a FUND transaction with PENDING then SUCCESS status', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockSenderWallet);
      mockWalletRepo.findByIdForUpdate
        .mockResolvedValueOnce(mockSenderWallet)
        .mockResolvedValueOnce(fundedWallet);

      await walletService.fund(SENDER_USER_ID, { amount: 500 });

      expect(mockWalletRepo.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'FUND',
          amount: 500,
          sender_wallet_id: null,
          receiver_wallet_id: SENDER_WALLET_ID,
          status: 'PENDING',
        }),
        {},
      );
      expect(mockWalletRepo.updateTransactionStatus).toHaveBeenCalledWith(
        expect.any(String),
        'SUCCESS',
        {},
      );
    });

    it('throws 400 when amount is zero', async () => {
      await expect(
        walletService.fund(SENDER_USER_ID, { amount: 0 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('throws 400 when amount is negative', async () => {
      await expect(
        walletService.fund(SENDER_USER_ID, { amount: -100 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('throws 400 when amount exceeds 2 decimal places', async () => {
      await expect(
        walletService.fund(SENDER_USER_ID, { amount: 10.001 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('throws 404 when wallet does not exist', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(undefined);

      await expect(
        walletService.fund(SENDER_USER_ID, { amount: 500 }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── withdraw ──────────────────────────────────────────────────────────────────

  describe('withdraw', () => {
    const afterWithdrawWallet: Wallet = { ...mockSenderWallet, balance: 600 };

    it('decreases wallet balance by the withdrawn amount', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockSenderWallet);
      mockWalletRepo.findByIdForUpdate
        .mockResolvedValueOnce(mockSenderWallet)
        .mockResolvedValueOnce(afterWithdrawWallet);

      const result = await walletService.withdraw(SENDER_USER_ID, {
        amount: 400,
      });

      expect(result.balance).toBe(600);
      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        SENDER_WALLET_ID,
        600,
        {},
      );
    });

    it('creates a WITHDRAWAL transaction record', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockSenderWallet);
      mockWalletRepo.findByIdForUpdate
        .mockResolvedValueOnce(mockSenderWallet)
        .mockResolvedValueOnce(afterWithdrawWallet);

      await walletService.withdraw(SENDER_USER_ID, { amount: 400 });

      expect(mockWalletRepo.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'WITHDRAWAL',
          amount: 400,
          sender_wallet_id: SENDER_WALLET_ID,
          receiver_wallet_id: null,
          status: 'PENDING',
        }),
        {},
      );
    });

    it('throws 400 when withdrawing more than available balance', async () => {
      mockWalletRepo.findByUserId.mockResolvedValue(mockSenderWallet);
      mockWalletRepo.findByIdForUpdate.mockResolvedValueOnce(mockSenderWallet);

      await expect(
        walletService.withdraw(SENDER_USER_ID, { amount: 9999 }),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Insufficient balance',
      });
    });

    it('throws 400 when amount is zero or negative', async () => {
      await expect(
        walletService.withdraw(SENDER_USER_ID, { amount: 0 }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('throws 400 when amount exceeds 2 decimal places', async () => {
      await expect(
        walletService.withdraw(SENDER_USER_ID, { amount: 0.001 }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  // ── transfer ──────────────────────────────────────────────────────────────────

  describe('transfer', () => {
    // Each transfer test is fully self-contained — no shared beforeEach setup
    // here because different scenarios need different mock arrangements.

    const setupHappyPath = (senderBalance = 1000) => {
      const sender = { ...mockSenderWallet, balance: senderBalance };
      const updatedSender = { ...sender, balance: senderBalance - 400 };

      mockUserRepo.findById.mockResolvedValue(mockReceiverUser);
      mockWalletRepo.findByUserId
        .mockResolvedValueOnce(sender)
        .mockResolvedValueOnce(mockReceiverWallet);
      // SENDER_WALLET_ID ('aaaa...') < RECEIVER_WALLET_ID ('bbbb...')
      // so sender is locked first, receiver second
      mockWalletRepo.findByIdForUpdate
        .mockResolvedValueOnce(sender) // first lock
        .mockResolvedValueOnce(mockReceiverWallet) // second lock
        .mockResolvedValueOnce(updatedSender); // re-read after update
    };

    it('returns updated sender wallet after transfer', async () => {
      setupHappyPath();

      const result = await walletService.transfer(SENDER_USER_ID, {
        receiver_id: RECEIVER_USER_ID,
        amount: 400,
      });

      expect(result.balance).toBe(600);
    });

    it('debits sender and credits receiver with correct amounts', async () => {
      setupHappyPath();

      await walletService.transfer(SENDER_USER_ID, {
        receiver_id: RECEIVER_USER_ID,
        amount: 400,
      });

      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        SENDER_WALLET_ID,
        600,
        {},
      );
      expect(mockWalletRepo.updateBalance).toHaveBeenCalledWith(
        RECEIVER_WALLET_ID,
        900,
        {},
      );
    });

    it('creates a TRANSFER transaction record', async () => {
      setupHappyPath();

      await walletService.transfer(SENDER_USER_ID, {
        receiver_id: RECEIVER_USER_ID,
        amount: 400,
      });

      expect(mockWalletRepo.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TRANSFER',
          amount: 400,
          sender_wallet_id: SENDER_WALLET_ID,
          receiver_wallet_id: RECEIVER_WALLET_ID,
          status: 'PENDING',
        }),
        {},
      );
    });

    it('throws 400 when sender and receiver are the same user', async () => {
      await expect(
        walletService.transfer(SENDER_USER_ID, {
          receiver_id: SENDER_USER_ID,
          amount: 400,
        }),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Cannot transfer funds to yourself',
      });
    });

    it('throws 400 when sender has insufficient balance', async () => {
      mockUserRepo.findById.mockResolvedValue(mockReceiverUser);
      mockWalletRepo.findByUserId
        .mockResolvedValueOnce(mockSenderWallet) // balance: 1000
        .mockResolvedValueOnce(mockReceiverWallet);
      mockWalletRepo.findByIdForUpdate
        .mockResolvedValueOnce(mockSenderWallet)
        .mockResolvedValueOnce(mockReceiverWallet);

      await expect(
        walletService.transfer(SENDER_USER_ID, {
          receiver_id: RECEIVER_USER_ID,
          amount: 9999,
        }),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Insufficient balance',
      });
    });

    it('throws 404 when receiver user does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(undefined);

      await expect(
        walletService.transfer(SENDER_USER_ID, {
          receiver_id: 'nonexistent-user-id',
          amount: 100,
        }),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Receiver not found',
      });
    });

    it('throws 400 when amount exceeds 2 decimal places', async () => {
      await expect(
        walletService.transfer(SENDER_USER_ID, {
          receiver_id: RECEIVER_USER_ID,
          amount: 100.001,
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
