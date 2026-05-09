// src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { errorResponse } from '../utils/helpers';

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res
      .status(401)
      .json(errorResponse('Missing or invalid authorization header'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof (decoded as { id?: unknown }).id !== 'string'
    ) {
      res.status(401).json(errorResponse('Invalid token payload'));
      return;
    }
    req.user = { id: (decoded as { id: string }).id };
    next();
  } catch {
    res.status(401).json(errorResponse('Invalid or expired token'));
  }
};
