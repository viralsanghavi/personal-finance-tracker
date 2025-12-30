-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "month" TEXT NOT NULL DEFAULT '1970-01',
    "date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "categoryId", "createdAt", "date", "description", "id", "type", "updatedAt") SELECT "amount", "categoryId", "createdAt", "date", "description", "id", "type", "updatedAt" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE INDEX "Expense_date_idx" ON "Expense"("date");
CREATE INDEX "Expense_month_idx" ON "Expense"("month");
CREATE TABLE "new_Investment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "monthlyContribution" INTEGER NOT NULL,
    "month" TEXT NOT NULL DEFAULT '1970-01',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Investment" ("amount", "createdAt", "id", "monthlyContribution", "name", "updatedAt") SELECT "amount", "createdAt", "id", "monthlyContribution", "name", "updatedAt" FROM "Investment";
DROP TABLE "Investment";
ALTER TABLE "new_Investment" RENAME TO "Investment";
CREATE INDEX "Investment_month_idx" ON "Investment"("month");
CREATE TABLE "new_Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lender" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "month" TEXT NOT NULL DEFAULT '1970-01',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Loan" ("amount", "createdAt", "dueDate", "id", "lender", "status", "updatedAt") SELECT "amount", "createdAt", "dueDate", "id", "lender", "status", "updatedAt" FROM "Loan";
DROP TABLE "Loan";
ALTER TABLE "new_Loan" RENAME TO "Loan";
CREATE INDEX "Loan_dueDate_idx" ON "Loan"("dueDate");
CREATE INDEX "Loan_month_idx" ON "Loan"("month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
