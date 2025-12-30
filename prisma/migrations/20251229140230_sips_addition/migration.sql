-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Investment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "amount" INTEGER NOT NULL,
    "monthlyContribution" INTEGER NOT NULL,
    "collectedAsOf" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "bank" TEXT,
    "schedule" TEXT,
    "month" TEXT NOT NULL DEFAULT '1970-01',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Investment" ("amount", "createdAt", "id", "month", "monthlyContribution", "name", "updatedAt") SELECT "amount", "createdAt", "id", "month", "monthlyContribution", "name", "updatedAt" FROM "Investment";
DROP TABLE "Investment";
ALTER TABLE "new_Investment" RENAME TO "Investment";
CREATE INDEX "Investment_month_idx" ON "Investment"("month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
