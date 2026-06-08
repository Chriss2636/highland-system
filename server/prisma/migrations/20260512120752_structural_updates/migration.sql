-- CreateTable
CREATE TABLE "CustomerSMS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "preparedBy" TEXT NOT NULL,
    "writtenBy" TEXT,
    "approvedBy" TEXT,
    "sentBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
