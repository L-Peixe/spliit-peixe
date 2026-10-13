-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "defaultSplitMode" "SplitMode" NOT NULL DEFAULT 'EVENLY';

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "defaultShares" INTEGER NOT NULL DEFAULT 100;
