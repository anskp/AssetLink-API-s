-- CreateTable
CREATE TABLE `asset_metadata` (
    `id` VARCHAR(191) NOT NULL,
    `custodyRecordId` VARCHAR(191) NOT NULL,
    `assetType` VARCHAR(191) NOT NULL,
    `assetName` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `manufacturer` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `yearManufactured` INTEGER NULL,
    `estimatedValue` VARCHAR(191) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `valuationDate` DATETIME(3) NULL,
    `valuationMethod` VARCHAR(191) NULL,
    `verifiedBy` VARCHAR(191) NULL,
    `verificationDate` DATETIME(3) NULL,
    `verificationNotes` TEXT NULL,
    `documents` JSON NOT NULL,
    `images` JSON NOT NULL,
    `customFields` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `asset_metadata_custodyRecordId_key`(`custodyRecordId`),
    INDEX `asset_metadata_assetType_idx`(`assetType`),
    INDEX `asset_metadata_custodyRecordId_idx`(`custodyRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asset_metadata` ADD CONSTRAINT `asset_metadata_custodyRecordId_fkey` FOREIGN KEY (`custodyRecordId`) REFERENCES `custody_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
