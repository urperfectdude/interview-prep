-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "googleSub" TEXT,
    "passwordHash" TEXT,
    "name" TEXT,
    "picture" TEXT,
    "resumeText" TEXT,
    "resumeFileName" TEXT,
    "targetRole" TEXT,
    "seniority" TEXT,
    "interviewerVoice" TEXT NOT NULL DEFAULT 'alloy',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'intake',
    "roleTitle" TEXT,
    "roleDescriptionRaw" TEXT,
    "jdText" TEXT,
    "resumeText" TEXT,
    "candidateProfile" TEXT,
    "questionPlan" TEXT,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("candidateProfile", "createdAt", "id", "jdText", "questionPlan", "resumeText", "roleDescriptionRaw", "roleTitle", "status", "summary", "updatedAt") SELECT "candidateProfile", "createdAt", "id", "jdText", "questionPlan", "resumeText", "roleDescriptionRaw", "roleTitle", "status", "summary", "updatedAt" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");
