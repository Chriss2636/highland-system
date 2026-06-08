-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivalTime" TEXT NOT NULL,
    "salesTeam" TEXT NOT NULL,
    "teamLeader" TEXT NOT NULL,
    "mainActivities" TEXT NOT NULL,
    "clientProgress" TEXT NOT NULL,
    "siteVisit" TEXT NOT NULL,
    "tomorrowPlan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "comments" TEXT,
    "createdBy" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assistantDirectorComments" TEXT,
    "assistantDirectorApprovedAt" DATETIME,
    "generalDirectorComments" TEXT,
    "generalDirectorApprovedAt" DATETIME,
    "workflowStatus" TEXT NOT NULL DEFAULT 'pending_assistant',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DailyReport" ("arrivalTime", "clientProgress", "comments", "createdAt", "date", "id", "mainActivities", "salesTeam", "siteVisit", "status", "teamLeader", "tomorrowPlan") SELECT "arrivalTime", "clientProgress", "comments", "createdAt", "date", "id", "mainActivities", "salesTeam", "siteVisit", "status", "teamLeader", "tomorrowPlan" FROM "DailyReport";
DROP TABLE "DailyReport";
ALTER TABLE "new_DailyReport" RENAME TO "DailyReport";
CREATE TABLE "new_Requisition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectName" TEXT NOT NULL,
    "cashRequestedBy" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "amountWords" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "paymentCodes" TEXT,
    "preparedBy" TEXT NOT NULL,
    "preparedByDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "financeManager" TEXT,
    "approvedBy" TEXT,
    "approvedByDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending_assistant',
    "createdBy" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assistantDirectorComments" TEXT,
    "assistantDirectorApprovedAt" DATETIME,
    "generalDirectorComments" TEXT,
    "generalDirectorApprovedAt" DATETIME,
    "workflowStatus" TEXT NOT NULL DEFAULT 'pending_assistant',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Requisition" ("amount", "amountWords", "approvedBy", "approvedByDate", "cashRequestedBy", "createdAt", "financeManager", "id", "paymentCodes", "preparedBy", "preparedByDate", "projectName", "purpose", "status") SELECT "amount", "amountWords", "approvedBy", "approvedByDate", "cashRequestedBy", "createdAt", "financeManager", "id", "paymentCodes", "preparedBy", "preparedByDate", "projectName", "purpose", "status" FROM "Requisition";
DROP TABLE "Requisition";
ALTER TABLE "new_Requisition" RENAME TO "Requisition";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
