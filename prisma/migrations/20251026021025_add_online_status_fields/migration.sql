-- DropForeignKey
ALTER TABLE "public"."AiChat" DROP CONSTRAINT "AiChat_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AiChatSession" DROP CONSTRAINT "AiChatSession_userId_fkey";

-- DropIndex
DROP INDEX "public"."AiChat_sessionId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."AiChatSession_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
