-- Credit wallet service users.
CREATE TABLE IF NOT EXISTS `users` (
	`id` char(36) NOT NULL,
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL UNIQUE,
	`phone_number` varchar(255) NOT NULL UNIQUE,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`)
) COMMENT='Credit wallet service users.';
-- Wallet balances per user (one-to-one).
CREATE TABLE IF NOT EXISTS `wallets` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL UNIQUE,
	`balance` decimal(20,2) NOT NULL DEFAULT 0.00,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`)
) COMMENT='Wallet balances per user (one-to-one).';
-- Ledger of wallet transfers/credits/debits.
CREATE TABLE IF NOT EXISTS `transactions` (
	`id` char(36) NOT NULL,
	`reference` varchar(255) NOT NULL UNIQUE,
	`type` ENUM('FUND', 'TRANSFER', 'WITHDRAWAL') NOT NULL,
	`amount` decimal(20,2) NOT NULL,
	`sender_wallet_id` char(36),
	`receiver_wallet_id` char(36),
	`status` ENUM('PENDING', 'SUCCESS', 'FAILED')NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`)
) COMMENT='Ledger of wallet transfers/credits/debits.';
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_fk1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`);
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_fk4` FOREIGN KEY (`sender_wallet_id`) REFERENCES `wallets`(`id`);
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_fk5` FOREIGN KEY (`receiver_wallet_id`) REFERENCES `wallets`(`id`);
CREATE INDEX `idx_transactions_sender` USING BTREE ON `transactions` (`sender_wallet_id`);
CREATE INDEX `idx_transactions_receiver` USING BTREE ON `transactions` (`receiver_wallet_id`);