CREATE TABLE `appeals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`report_id` text,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`decision_reason` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `blocks` (
	`blocker_id` text NOT NULL,
	`blocked_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blocked_pair` ON `blocks` (`blocker_id`,`blocked_id`);--> statement-breakpoint
CREATE TABLE `contact_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`purpose` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`phone_shared` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_pair` ON `contact_requests` (`listing_id`,`requester_id`);--> statement-breakpoint
CREATE INDEX `contact_owner` ON `contact_requests` (`owner_id`);--> statement-breakpoint
CREATE TABLE `declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`version` text NOT NULL,
	`listing_id` text NOT NULL,
	`accepted_at` integer NOT NULL,
	`text_snapshot` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`listing_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_pair` ON `favorites` (`user_id`,`listing_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`transaction` text NOT NULL,
	`type` text NOT NULL,
	`city` text DEFAULT 'Cluj-Napoca' NOT NULL,
	`district` text NOT NULL,
	`price` real NOT NULL,
	`currency` text NOT NULL,
	`area` real NOT NULL,
	`rooms` integer NOT NULL,
	`description` text NOT NULL,
	`photos` text NOT NULL,
	`exact_address` text DEFAULT '' NOT NULL,
	`relationship` text NOT NULL,
	`rent_deposit` real,
	`rent_costs` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`ownership_status` text DEFAULT 'declared' NOT NULL,
	`accepts_contacts` integer DEFAULT 1 NOT NULL,
	`contact_hours` text DEFAULT '' NOT NULL,
	`risk_signals` text DEFAULT '[]' NOT NULL,
	`moderation_reason` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`available_until` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `listing_feed` ON `listings` (`status`,`available_until`);--> statement-breakpoint
CREATE INDEX `listing_owner` ON `listings` (`owner_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `contact_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_conversation` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `phone_challenges` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`provider_sid` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`listing_id` text,
	`conversation_id` text,
	`reason` text NOT NULL,
	`details` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`decision_reason` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`conversation_id`) REFERENCES `contact_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`phone_hash` text,
	`phone_verified_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_hash_unique` ON `users` (`phone_hash`);--> statement-breakpoint
CREATE TABLE `viewings` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`proposed_by` text NOT NULL,
	`starts_at` integer NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `contact_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proposed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
