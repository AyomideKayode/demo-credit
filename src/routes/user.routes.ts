// src/routes/user.routes.ts

import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const userController = new UserController();

router.post('/', userController.register);
router.get('/:id', authenticate, userController.getById);

export default router;
