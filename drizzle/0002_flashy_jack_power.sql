ALTER TABLE `stickerProjects` ADD `stickerCount` int DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `stickerProjects` ADD `mainImageUrl` text;--> statement-breakpoint
ALTER TABLE `stickerProjects` ADD `tabImageUrl` text;