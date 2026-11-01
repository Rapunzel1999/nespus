CREATE TABLE `message_reads` (
	`user_id` text NOT NULL,
	`message_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_read_pair` ON `message_reads` (`user_id`,`message_id`);--> statement-breakpoint
CREATE INDEX `contact_requester` ON `contact_requests` (`requester_id`);