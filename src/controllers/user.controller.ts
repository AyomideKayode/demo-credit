// src/controllers/user.controller.ts

import { Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service';
import { AppError } from '../types';
import { successResponse, errorResponse } from '../utils/helpers';

const createUserSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().min(7, 'Invalid phone number'),
});

export class UserController {
  private userService = new UserService();

  register = async (req: Request, res: Response): Promise<void> => {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(errorResponse(result.error.issues[0].message));
      return;
    }

    try {
      const { user, token } = await this.userService.register(result.data);
      res
        .status(201)
        .json(successResponse('Account created successfully', { user, token }));
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.status).json(errorResponse(err.message));
        return;
      }
      res.status(500).json(errorResponse('An unexpected error occurred'));
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = String(req.params.id);

      if (req.user?.id !== userId) {
        res.status(403).json(errorResponse('Access denied'));
        return;
      }

      const user = await this.userService.findById(userId);
      res.json(successResponse('User retrieved successfully', user));
    } catch (err: unknown) {
      if (err instanceof AppError) {
        res.status(err.status).json(errorResponse(err.message));
        return;
      }
      res.status(500).json(errorResponse('An unexpected error occurred'));
    }
  };
}
