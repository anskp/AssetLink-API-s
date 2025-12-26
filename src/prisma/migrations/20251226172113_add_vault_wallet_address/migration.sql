/*
  Warnings:

  - A unique constraint covering the columns `[fireblocksId,blockchain]` on the table `vault_wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `custody_operations` DROP FOREIGN KEY `custody_operations_custodyRecordId_fkey`;

-- DropIndex
DROP INDEX `vault_wallets_fireblocksId_key` ON `vault_wallets`;

-- AlterTable
ALTER TABLE `custody_operations` MODIFY `custodyRecordId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `vault_wallets` ADD COLUMN `address` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `vault_wallets_fireblocksId_blockchain_key` ON `vault_wallets`(`fireblocksId`, `blockchain`);

-- AddForeignKey
ALTER TABLE `custody_operations` ADD CONSTRAINT `custody_operations_custodyRecordId_fkey` FOREIGN KEY (`custodyRecordId`) REFERENCES `custody_records`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
