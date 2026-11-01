CREATE TABLE `saved_searches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`query_json` text NOT NULL,
	`seen_event` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `saved_search_pair` ON `saved_searches` (`user_id`,`query_json`);--> statement-breakpoint
ALTER TABLE `listings` ADD `monthly_costs` real;--> statement-breakpoint
CREATE INDEX `audit_target_action_time` ON `audit_events` (`target_id`,`action`,`created_at`);