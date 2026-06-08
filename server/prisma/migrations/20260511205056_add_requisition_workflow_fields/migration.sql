-- AlterTable
ALTER TABLE "DailyReport" ADD COLUMN "finalApprovedAt" DATETIME;
ALTER TABLE "DailyReport" ADD COLUMN "finalComments" TEXT;
ALTER TABLE "DailyReport" ADD COLUMN "financeManagerApprovedAt" DATETIME;
ALTER TABLE "DailyReport" ADD COLUMN "financeManagerComments" TEXT;
