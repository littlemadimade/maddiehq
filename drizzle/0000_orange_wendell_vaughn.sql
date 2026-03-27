CREATE TABLE `account_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`follower_count` integer,
	`media_count` integer,
	`reach` integer,
	`impressions` integer,
	`profile_views` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_snapshots_platform_date_idx` ON `account_snapshots` (`platform`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `demographics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`metric` text NOT NULL,
	`key` text NOT NULL,
	`value` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demographics_unique_idx` ON `demographics` (`platform`,`snapshot_date`,`metric`,`key`);--> statement-breakpoint
CREATE TABLE `platforms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`account_id` text NOT NULL,
	`username` text,
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platforms_platform_account_idx` ON `platforms` (`platform`,`account_id`);--> statement-breakpoint
CREATE TABLE `post_insights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`snapshot_date` text NOT NULL,
	`impressions` integer,
	`reach` integer,
	`engagement` integer,
	`saves` integer,
	`likes` integer,
	`comments` integer,
	`shares` integer,
	`score` integer,
	`upvote_ratio` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_insights_post_date_idx` ON `post_insights` (`post_id`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform_post_id` text NOT NULL,
	`platform` text NOT NULL,
	`caption` text,
	`media_type` text,
	`permalink` text,
	`published_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_platform_post_idx` ON `posts` (`platform`,`platform_post_id`);