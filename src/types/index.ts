// src/types/index.ts

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

export type TransactionType = 'FUND' | 'TRANSFER' | 'WITHDRAWAL';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  amount: number;
  sender_wallet_id: string | null;
  receiver_wallet_id: string | null;
  status: TransactionStatus;
  created_at: Date;
  updated_at: Date;
}

// Request body shapes
export interface CreateUserDto {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export interface FundWalletDto {
  amount: number;
}

export interface TransferDto {
  receiver_id: string;
  amount: number;
}

export interface WithdrawDto {
  amount: number;
}

// API response envelope: to standardize responses across the application
export interface ApiResponse<T = null> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}
