CREATE TABLE `content_insights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`platform` text NOT NULL,
	`report_json` text NOT NULL,
	`posts_analyzed` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `post_analysis` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`setting` text,
	`lighting` text,
	`face_visible` integer,
	`text_overlay` integer,
	`visual_style` text,
	`caption_length` integer,
	`hook_type` text,
	`cta_present` integer,
	`cta_type` text,
	`caption_tone` text,
	`emoji_count` integer,
	`hashtag_count` integer,
	`raw_analysis` text,
	`analyzed_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_analysis_post_idx` ON `post_analysis` (`post_id`);--> statement-breakpoint
ALTER TABLE `posts` ADD `media_url` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `thumbnail_url` text;