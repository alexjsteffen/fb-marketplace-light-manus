CREATE TABLE `backgroundTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`previewUrl` text,
	`templateType` enum('gradient_modern','gradient_sunset','solid_professional','textured_premium','branded_dealer','seasonal_special') NOT NULL,
	`config` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `backgroundTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dealers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`contactEmail` varchar(320),
	`contactPhone` varchar(50),
	`websiteUrl` text,
	`logoUrl` text,
	`brandColor` varchar(7) DEFAULT '#3b82f6',
	`ownerId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dealers_id` PRIMARY KEY(`id`),
	CONSTRAINT `dealers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `facebookAds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealerId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`templateId` int,
	`originalText` text,
	`enhancedText` text,
	`finalText` text,
	`imageUrl` text,
	`imageFileKey` text,
	`status` enum('draft','staged','published') NOT NULL DEFAULT 'draft',
	`facebookMarketplaceUrl` text,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facebookAds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generatedContent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealerId` int NOT NULL,
	`facebookAdId` int NOT NULL,
	`contentType` enum('pillar_page','blog_post','badge_image') NOT NULL,
	`title` varchar(255),
	`content` text,
	`badgeImageUrl` text,
	`badgeImageFileKey` text,
	`exportFormat` enum('markdown','html','json') NOT NULL DEFAULT 'markdown',
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generatedContent_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventoryItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dealerId` int NOT NULL,
	`stockNumber` varchar(100) NOT NULL,
	`brand` varchar(100),
	`category` varchar(100),
	`year` int,
	`model` varchar(255),
	`description` text,
	`price` decimal(10,2),
	`location` text,
	`imageUrl` text,
	`status` enum('active','sold','archived') NOT NULL DEFAULT 'active',
	`condition` enum('new','used') NOT NULL DEFAULT 'used',
	`soldAt` timestamp,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventoryItems_id` PRIMARY KEY(`id`)
);
