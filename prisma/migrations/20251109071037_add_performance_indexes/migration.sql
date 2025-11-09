-- CreateIndex
CREATE INDEX "Channel_type_name_idx" ON "Channel"("type", "name");

-- CreateIndex
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_parentMessageId_createdAt_idx" ON "Message"("parentMessageId", "createdAt");
