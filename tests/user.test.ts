// tests/user.test.ts

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

vi.mock('../src/repositories/user.repository');
vi.mock('../src/repositories/wallet.repository');
vi.mock('../src/services/karma.service');

import { UserService } from '../src/services/user.service';
import { UserRepository } from '../src/repositories/user.repository';
import { WalletRepository } from '../src/repositories/wallet.repository';
import { KarmaService } from '../src/services/karma.service';
import db from '../src/config/database';
import { AppError, User } from '../src/types';

const mockUser: User = {
  id: 'test-user-id',
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  phone_number: '08012345678',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockWalletRepo: Record<string, ReturnType<typeof vi.fn>>;
  let mockKarmaServiceInstance: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockWalletRepo = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    mockKarmaServiceInstance = {
      isBlacklisted: vi.fn(),
    };

    // vi.mocked(UserRepository).mockImplementation(() => mockUserRepo as any);
    // vi.mocked(WalletRepository).mockImplementation(() => mockWalletRepo as any);
    // vi.mocked(KarmaService).mockImplementation(
    //   () => mockKarmaServiceInstance as any,
    // );

    vi.mocked(UserRepository).mockImplementation(function () {
      return mockUserRepo as any;
    } as any);

    vi.mocked(WalletRepository).mockImplementation(function () {
      return mockWalletRepo as any;
    } as any);

    vi.mocked(KarmaService).mockImplementation(function () {
      return mockKarmaServiceInstance as any;
    } as any);

    vi.mocked(db.transaction).mockImplementation(async (callback: any) =>
      callback({}),
    );

    userService = new UserService();
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      first_name: 'Ayomide',
      last_name: 'Kayode',
      email: 'clean@example.com',
      phone_number: '08099887766',
    };

    it('registers a clean user and returns user object with JWT', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(undefined);
      mockKarmaServiceInstance.isBlacklisted.mockResolvedValue(false);

      const result = await userService.register(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.user.first_name).toBe(dto.first_name);
      expect(result.user.id).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.').length).toBe(3); // valid JWT structure
    });

    it('calls Karma with the registering email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(undefined);
      mockKarmaServiceInstance.isBlacklisted.mockResolvedValue(false);

      await userService.register(dto);

      expect(mockKarmaServiceInstance.isBlacklisted).toHaveBeenCalledWith(
        dto.email,
      );
    });

    it('throws 403 when email is on the Karma blacklist', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(undefined);
      mockKarmaServiceInstance.isBlacklisted.mockResolvedValue(true);

      await expect(userService.register(dto)).rejects.toMatchObject({
        status: 403,
        message: 'User is not eligible for onboarding',
      });
    });

    it('throws 409 on duplicate email (fast path pre-check)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      await expect(userService.register(dto)).rejects.toMatchObject({
        status: 409,
        message: 'A user with this email already exists',
      });

      // Karma must not be called if email already exists
      expect(mockKarmaServiceInstance.isBlacklisted).not.toHaveBeenCalled();
    });

    it('throws 409 on DB duplicate key constraint (race / duplicate phone)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(undefined);
      mockKarmaServiceInstance.isBlacklisted.mockResolvedValue(false);

      const dupError = Object.assign(new Error('Duplicate entry'), {
        code: 'ER_DUP_ENTRY',
      });
      vi.mocked(db.transaction).mockRejectedValueOnce(dupError);

      await expect(userService.register(dto)).rejects.toMatchObject({
        status: 409,
        message: 'A user with this email or phone number already exists',
      });
    });

    it('propagates 503 when Karma service is unreachable', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(undefined);
      mockKarmaServiceInstance.isBlacklisted.mockRejectedValue(
        new AppError(
          503,
          'Unable to verify user eligibility. Please try again later.',
        ),
      );

      await expect(userService.register(dto)).rejects.toMatchObject({
        status: 503,
      });
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the user when found', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const user = await userService.findById(mockUser.id);

      expect(user).toEqual(mockUser);
      expect(mockUserRepo.findById).toHaveBeenCalledWith(mockUser.id);
    });

    it('throws 404 when user does not exist', async () => {
      mockUserRepo.findById.mockResolvedValue(undefined);

      await expect(
        userService.findById('nonexistent-id'),
      ).rejects.toMatchObject({
        status: 404,
        message: 'User not found',
      });
    });
  });
});
