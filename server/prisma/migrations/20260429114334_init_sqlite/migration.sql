-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL DEFAULT 'buyer',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT NOT NULL,
    "description" TEXT,
    "details" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "sqm" REAL,
    "plotInfo" TEXT,
    "comments" TEXT DEFAULT 'Monthly installment',
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receiptNo" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'Bank Transfer',
    "plotNumber" TEXT,
    "description" TEXT DEFAULT 'Property Acquisition',
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT,
    "clientId" TEXT,
    "invoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Receipt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Receipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'Sale',
    "plotNo" TEXT NOT NULL,
    "block" TEXT,
    "size" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "priceWords" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Dodoma',
    "clauses" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agreement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyReport" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Requisition" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CompanySetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "name" TEXT NOT NULL DEFAULT 'Highland Property Ltd',
    "tin" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "logoUrl" TEXT,
    "smsApiKey" TEXT,
    "smsSecret" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNo_key" ON "Receipt"("receiptNo");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
