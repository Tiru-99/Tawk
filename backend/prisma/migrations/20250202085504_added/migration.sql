-- DropForeignKey
ALTER TABLE "ChatModelUsers" DROP CONSTRAINT "ChatModelUsers_chatId_fkey";

-- DropForeignKey
ALTER TABLE "ChatModelUsers" DROP CONSTRAINT "ChatModelUsers_userId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModelUsers" ADD CONSTRAINT "ChatModelUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatModelUsers" ADD CONSTRAINT "ChatModelUsers_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ChatModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
