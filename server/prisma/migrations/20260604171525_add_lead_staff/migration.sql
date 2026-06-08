-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "presentLocation" TEXT NOT NULL,
    "dateToVisit" DATETIME NOT NULL,
    "numSitesToVisit" INTEGER NOT NULL,
    "locationToVisit" TEXT NOT NULL,
    "alreadyVisited" BOOLEAN NOT NULL DEFAULT false,
    "visitedSitesCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("alreadyVisited", "createdAt", "dateToVisit", "fullName", "id", "locationToVisit", "numSitesToVisit", "phone", "presentLocation", "visitedSitesCount") SELECT "alreadyVisited", "createdAt", "dateToVisit", "fullName", "id", "locationToVisit", "numSitesToVisit", "phone", "presentLocation", "visitedSitesCount" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
