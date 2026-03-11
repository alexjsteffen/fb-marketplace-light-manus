CREATE TABLE `backgroundTemplates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`previewUrl` text,
	`templateType` text NOT NULL,
	`config` text NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dealers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`contactEmail` text,
	`contactPhone` text,
	`websiteUrl` text,
	`logoUrl` text,
	`brandColor` text DEFAULT '#3b82f6',
	`tagline` text,
	`ownerId` integer NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dealers_slug_unique` ON `dealers` (`slug`);--> statement-breakpoint
CREATE TABLE `facebookAds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dealerId` integer NOT NULL,
	`inventoryItemId` integer NOT NULL,
	`templateId` integer,
	`originalText` text,
	`enhancedText` text,
	`finalText` text,
	`imageUrl` text,
	`imageFileKey` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`facebookMarketplaceUrl` text,
	`publishedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generatedContent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dealerId` integer NOT NULL,
	`facebookAdId` integer NOT NULL,
	`contentType` text NOT NULL,
	`title` text,
	`content` text,
	`badgeImageUrl` text,
	`badgeImageFileKey` text,
	`exportFormat` text DEFAULT 'markdown' NOT NULL,
	`metadata` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventoryItems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dealerId` integer NOT NULL,
	`stockNumber` text NOT NULL,
	`brand` text,
	`category` text,
	`year` integer,
	`model` text,
	`trim` text,
	`description` text,
	`price` text,
	`mileage` text,
	`vin` text,
	`exteriorColor` text,
	`interiorColor` text,
	`engine` text,
	`transmission` text,
	`drivetrain` text,
	`fuel` text,
	`cylinders` text,
	`doors` text,
	`detailUrl` text,
	`location` text,
	`imageUrl` text,
	`status` text DEFAULT 'active' NOT NULL,
	`condition` text DEFAULT 'used' NOT NULL,
	`soldAt` integer,
	`lastSeenAt` integer DEFAULT (unixepoch()) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`username` text,
	`passwordHash` text,
	`mustChangePassword` integer DEFAULT true,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`dealerId` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastSignedIn` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);