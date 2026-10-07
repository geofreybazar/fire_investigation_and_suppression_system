-- AlterTable
ALTER TABLE "Office" ADD COLUMN     "regionId" TEXT;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
