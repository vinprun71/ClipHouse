-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "creator" TEXT,
    "thumbnail" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Video" ("category", "createdAt", "creator", "id", "notes", "platform", "tags", "thumbnail", "title", "updatedAt", "url") SELECT "category", "createdAt", "creator", "id", "notes", "platform", "tags", "thumbnail", "title", "updatedAt", "url" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE INDEX "Video_category_idx" ON "Video"("category");
CREATE INDEX "Video_platform_idx" ON "Video"("platform");
CREATE INDEX "Video_favorite_idx" ON "Video"("favorite");
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
