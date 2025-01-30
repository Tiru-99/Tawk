/*
  Warnings:

  - You are about to drop the `_ChatModelToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ChatModelToUser" DROP CONSTRAINT "_ChatModelToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_ChatModelToUser" DROP CONSTRAINT "_ChatModelToUser_B_fkey";

-- DropTable
DROP TABLE "_ChatModelToUser";

-- CreateTable
CREATE TABLE "ChatModelUsers" (
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,

    CONSTRAINT "ChatModelUsers_pkey" PRIMARY KEY ("userId","chatId")
);

-- AddForeignKey
ALTER TABLE "ChatModelUsers" ADD CONSTRAINT "ChatModelUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModelUsers" ADD CONSTRAINT "ChatModelUsers_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ChatModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
