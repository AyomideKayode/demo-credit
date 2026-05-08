// src/repositories/user.repository.ts

import db from '../config/database';
import { User } from '../types';

export class UserRepository {
  async findById(id: string): Promise<User | undefined> {
    return db<User>('users').where({ id }).first();
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return db<User>('users').where({ email }).first();
  }

  async create(user: User): Promise<void> {
    await db<User>('users').insert(user);
  }
}
