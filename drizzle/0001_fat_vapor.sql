CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`source` text NOT NULL,
	`views` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `analytics` ADD `attempts` integer DEFAULT 0 NOT NULL;