// src/routes/index.ts

import { Router } from 'express';
import userRoutes from './user.routes';
import walletRoutes from './wallet.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/wallets', walletRoutes);

export default router;
