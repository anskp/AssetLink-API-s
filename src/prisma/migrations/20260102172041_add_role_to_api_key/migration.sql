/*
  Warnings:

  - Added the required column `quantity` to the `bids` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `bids` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `custody_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `custody_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantityListed` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `listings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `ownerships` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `api_keys` ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'MAKER';

-- AlterTable
ALTER TABLE `bids` ADD COLUMN `quantity` VARCHAR(191) NOT NULL,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `custody_records` ADD COLUMN `createdBy` VARCHAR(191) NOT NULL,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `listings` ADD COLUMN `quantityListed` VARCHAR(191) NOT NULL,
    ADD COLUMN `quantitySold` VARCHAR(191) NOT NULL DEFAULT '0',
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `ownerships` ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    ADD COLUMN `purchasePrice` VARCHAR(191) NULL,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `bids_tenantId_idx` ON `bids`(`tenantId`);

-- CreateIndex
CREATE INDEX `custody_records_tenantId_idx` ON `custody_records`(`tenantId`);

-- CreateIndex
CREATE INDEX `custody_records_createdBy_idx` ON `custody_records`(`createdBy`);

-- CreateIndex
CREATE INDEX `listings_tenantId_idx` ON `listings`(`tenantId`);

-- CreateIndex
CREATE INDEX `ownerships_tenantId_idx` ON `ownerships`(`tenantId`);

-- AddForeignKey
ALTER TABLE `user_balances` ADD CONSTRAINT `user_balances_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
