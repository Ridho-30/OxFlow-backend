/*
  Warnings:

  - You are about to alter the column `income_snapshot` on the `laporan` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(15,2)`.
  - You are about to alter the column `threshold_snapshot` on the `laporan` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(15,2)`.

*/
-- AlterTable
ALTER TABLE "laporan" ALTER COLUMN "income_snapshot" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "threshold_snapshot" SET DATA TYPE DECIMAL(15,2);
