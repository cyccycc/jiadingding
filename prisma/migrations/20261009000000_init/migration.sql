-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Watch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "ruleType" TEXT NOT NULL,
    "targetPrice" REAL,
    "dropPercent" REAL,
    "joinPrice" REAL,
    "lastPrice" REAL,
    "lastListPrice" REAL,
    "lastCheckedAt" DATETIME,
    "lastNotifiedPrice" REAL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Watch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watchId" TEXT NOT NULL,
    "salePrice" REAL,
    "listPrice" REAL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceCheck_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "watchId" TEXT NOT NULL,
    "salePrice" REAL NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "outboxPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Watch_userId_idx" ON "Watch"("userId");

-- CreateIndex
CREATE INDEX "Watch_enabled_idx" ON "Watch"("enabled");

-- CreateIndex
CREATE INDEX "PriceCheck_watchId_checkedAt_idx" ON "PriceCheck"("watchId", "checkedAt");

-- CreateIndex
CREATE INDEX "Notification_watchId_createdAt_idx" ON "Notification"("watchId", "createdAt");
