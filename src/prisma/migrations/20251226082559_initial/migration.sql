-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `publicKey` VARCHAR(191) NOT NULL,
    `secretKeyHash` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `permissions` JSON NOT NULL,
    `ipWhitelist` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_keys_publicKey_key`(`publicKey`),
    INDEX `api_keys_publicKey_idx`(`publicKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vault_wallets` (
    `id` VARCHAR(191) NOT NULL,
    `fireblocksId` VARCHAR(191) NOT NULL,
    `blockchain` VARCHAR(191) NOT NULL,
    `vaultType` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vault_wallets_fireblocksId_key`(`fireblocksId`),
    INDEX `vault_wallets_fireblocksId_idx`(`fireblocksId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custody_records` (
    `id` VARCHAR(191) NOT NULL,
    `assetId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `blockchain` VARCHAR(191) NULL,
    `tokenStandard` VARCHAR(191) NULL,
    `tokenAddress` VARCHAR(191) NULL,
    `tokenId` VARCHAR(191) NULL,
    `quantity` VARCHAR(191) NULL,
    `vaultWalletId` VARCHAR(191) NULL,
    `linkedAt` DATETIME(3) NULL,
    `mintedAt` DATETIME(3) NULL,
    `withdrawnAt` DATETIME(3) NULL,
    `burnedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `custody_records_assetId_key`(`assetId`),
    INDEX `custody_records_assetId_idx`(`assetId`),
    INDEX `custody_records_status_idx`(`status`),
    INDEX `custody_records_tokenAddress_tokenId_idx`(`tokenAddress`, `tokenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custody_operations` (
    `id` VARCHAR(191) NOT NULL,
    `operationType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `custodyRecordId` VARCHAR(191) NOT NULL,
    `vaultWalletId` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `initiatedBy` VARCHAR(191) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `rejectedBy` VARCHAR(191) NULL,
    `rejectionReason` TEXT NULL,
    `fireblocksTaskId` VARCHAR(191) NULL,
    `txHash` VARCHAR(191) NULL,
    `executedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `custody_operations_fireblocksTaskId_key`(`fireblocksTaskId`),
    UNIQUE INDEX `custody_operations_idempotencyKey_key`(`idempotencyKey`),
    INDEX `custody_operations_custodyRecordId_idx`(`custodyRecordId`),
    INDEX `custody_operations_status_idx`(`status`),
    INDEX `custody_operations_operationType_idx`(`operationType`),
    INDEX `custody_operations_fireblocksTaskId_idx`(`fireblocksTaskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `custodyRecordId` VARCHAR(191) NULL,
    `operationId` VARCHAR(191) NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `actor` VARCHAR(191) NOT NULL,
    `metadata` JSON NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_custodyRecordId_idx`(`custodyRecordId`),
    INDEX `audit_logs_operationId_idx`(`operationId`),
    INDEX `audit_logs_eventType_idx`(`eventType`),
    INDEX `audit_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `custody_records` ADD CONSTRAINT `custody_records_vaultWalletId_fkey` FOREIGN KEY (`vaultWalletId`) REFERENCES `vault_wallets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custody_operations` ADD CONSTRAINT `custody_operations_custodyRecordId_fkey` FOREIGN KEY (`custodyRecordId`) REFERENCES `custody_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custody_operations` ADD CONSTRAINT `custody_operations_vaultWalletId_fkey` FOREIGN KEY (`vaultWalletId`) REFERENCES `vault_wallets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_custodyRecordId_fkey` FOREIGN KEY (`custodyRecordId`) REFERENCES `custody_records`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_operationId_fkey` FOREIGN KEY (`operationId`) REFERENCES `custody_operations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
