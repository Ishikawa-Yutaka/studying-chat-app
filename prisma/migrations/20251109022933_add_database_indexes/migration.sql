-- CreateIndex
CREATE INDEX "AiChat_sessionId_idx" ON "AiChat"("sessionId");

-- CreateIndex
CREATE INDEX "AiChat_userId_idx" ON "AiChat"("userId");

-- CreateIndex
CREATE INDEX "AiChatSession_userId_idx" ON "AiChatSession"("userId");

-- CreateIndex
CREATE INDEX "Channel_type_idx" ON "Channel"("type");

-- CreateIndex
CREATE INDEX "ChannelMember_userId_idx" ON "ChannelMember"("userId");

-- CreateIndex
CREATE INDEX "ChannelMember_channelId_idx" ON "ChannelMember"("channelId");

-- CreateIndex
CREATE INDEX "Message_channelId_idx" ON "Message"("channelId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_parentMessageId_idx" ON "Message"("parentMessageId");

-- CreateIndex
CREATE INDEX "Message_channelId_parentMessageId_idx" ON "Message"("channelId", "parentMessageId");

-- CreateIndex
CREATE INDEX "User_authId_idx" ON "User"("authId");
