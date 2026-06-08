-- AlterTable
ALTER TABLE "User" ADD COLUMN "passport" TEXT;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "presentLocation" TEXT NOT NULL,
    "dateToVisit" DATETIME NOT NULL,
    "numSitesToVisit" INTEGER NOT NULL,
    "locationToVisit" TEXT NOT NULL,
    "alreadyVisited" BOOLEAN NOT NULL DEFAULT false,
    "visitedSitesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
