-- AlterTable
ALTER TABLE "Office" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Office_parentId_idx" ON "Office"("parentId");

-- CreateIndex
CREATE INDEX "Office_type_idx" ON "Office"("type");
