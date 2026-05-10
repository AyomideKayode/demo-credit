// src/routes/wallet.routes.ts

import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const walletController = new WalletController();

router.use(authenticate);

router.get('/me', walletController.getWallet);
router.post('/fund', walletController.fund);
router.post('/transfer', walletController.transfer);
router.post('/withdraw', walletController.withdraw);

export default router;
