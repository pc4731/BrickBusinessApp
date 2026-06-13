-- CreateEnum
CREATE TYPE "TruckRentalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JournalRefType" ADD VALUE 'TRUCK_RENTAL';
ALTER TYPE "JournalRefType" ADD VALUE 'TRUCK_RENTAL_PAYMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerAccount" ADD VALUE 'RENTAL_INCOME';
ALTER TYPE "LedgerAccount" ADD VALUE 'RENTAL_RECEIVABLE';

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "truckRentalId" TEXT;

-- CreateTable
CREATE TABLE "truck_rentals" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownTruckId" TEXT NOT NULL,
    "renterName" TEXT NOT NULL,
    "renterPhone" TEXT,
    "rentAmountPaise" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "TruckRentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "truck_rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_rental_payments" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "truckRentalId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "truck_rental_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "truck_rentals_orgId_status_idx" ON "truck_rentals"("orgId", "status");

-- CreateIndex
CREATE INDEX "truck_rentals_ownTruckId_idx" ON "truck_rentals"("ownTruckId");

-- CreateIndex
CREATE INDEX "truck_rentals_deletedAt_idx" ON "truck_rentals"("deletedAt");

-- CreateIndex
CREATE INDEX "truck_rental_payments_orgId_paymentDate_idx" ON "truck_rental_payments"("orgId", "paymentDate");

-- CreateIndex
CREATE INDEX "truck_rental_payments_truckRentalId_idx" ON "truck_rental_payments"("truckRentalId");

-- CreateIndex
CREATE INDEX "truck_rental_payments_deletedAt_idx" ON "truck_rental_payments"("deletedAt");

-- CreateIndex
CREATE INDEX "journal_entries_truckRentalId_idx" ON "journal_entries"("truckRentalId");

-- AddForeignKey
ALTER TABLE "truck_rentals" ADD CONSTRAINT "truck_rentals_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_rentals" ADD CONSTRAINT "truck_rentals_ownTruckId_fkey" FOREIGN KEY ("ownTruckId") REFERENCES "own_trucks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_rental_payments" ADD CONSTRAINT "truck_rental_payments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_rental_payments" ADD CONSTRAINT "truck_rental_payments_truckRentalId_fkey" FOREIGN KEY ("truckRentalId") REFERENCES "truck_rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
