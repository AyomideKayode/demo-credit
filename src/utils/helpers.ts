// src/utils/helper.ts

import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '../types';

export const generateId = (): string => uuidv4();

export const generateReference = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DC-${timestamp}-${random}`;
};

export const successResponse = <T>(
  message: string,
  data?: T
): ApiResponse<T> => ({
  status: 'success',
  message,
  ...(data !== undefined && { data }),
});

export const errorResponse = (message: string): ApiResponse => ({
  status: 'error',
  message,
});
