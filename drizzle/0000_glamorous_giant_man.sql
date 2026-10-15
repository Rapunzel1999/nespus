CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_subject` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_subject_unique` ON `accounts` (`provider_subject`);--> statement-breakpoint
CREATE TABLE `gifts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL,
	`account_id` text,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `gift_owner_created` ON `gifts` (`owner_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `gift_expiry` ON `gifts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text,
	`gift_id` text,
	`provider_event_id` text,
	`amount_minor` integer NOT NULL,
	`currency` text DEFAULT 'RON' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gift_id`) REFERENCES `gifts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_provider_event_id_unique` ON `orders` (`provider_event_id`);