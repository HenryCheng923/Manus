CREATE TABLE `stickerProjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT '我的貼圖',
	`templateImageUrl` text,
	`keywords` text,
	`status` enum('draft','generating','completed','failed') NOT NULL DEFAULT 'draft',
	`progress` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickerProjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stickers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`gridIndex` int NOT NULL,
	`keyword` varchar(100) NOT NULL,
	`originalImageUrl` text,
	`processedImageUrl` text,
	`finalImageUrl` text,
	`status` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stickers_id` PRIMARY KEY(`id`)
);
