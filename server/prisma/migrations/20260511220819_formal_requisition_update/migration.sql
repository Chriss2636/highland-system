/*
  Warnings:

  - You are about to drop the column `approvedBy` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `approvedByDate` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `assistantDirectorApprovedAt` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `assistantDirectorComments` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `financeManager` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `generalDirectorApprovedAt` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `generalDirectorComments` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `submittedAt` on the `Requisition` table. All the data in the column will be lost.
  - You are about to drop the column `workflowStatus` on the `Requisition` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Requisition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectName" TEXT NOT NULL,
    "cashRequestedBy" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT 'Operations',
    "amount" REAL NOT NULL,
    "amountWords" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "paymentCodes" TEXT,
    "preparedBy" TEXT NOT NULL,
    "preparedByDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assistantName" TEXT,
    "assistantDate" DATETIME,
    "directorName" TEXT,
    "directorDate" DATETIME,
    "financeName" TEXT,
    "financeDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending_assistant',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Requisition" ("amount", "amountWords", "cashRequestedBy", "createdAt", "id", "paymentCodes", "preparedBy", "preparedByDate", "projectName", "purpose", "status") SELECT "amount", "amountWords", "cashRequestedBy", "createdAt", "id", "paymentCodes", "preparedBy", "preparedByDate", "projectName", "purpose", "status" FROM "Requisition";
DROP TABLE "Requisition";
ALTER TABLE "new_Requisition" RENAME TO "Requisition";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
