import { prisma } from '../src/lib/prisma';

async function main() {
  const userCount = await prisma.user.count();
  const channelCount = await prisma.channel.count();
  const messageCount = await prisma.message.count();
  const memberCount = await prisma.channelMember.count();
  
  console.log('データベースの状態:');
  console.log(`User: ${userCount}件`);
  console.log(`Channel: ${channelCount}件`);
  console.log(`Message: ${messageCount}件`);
  console.log(`ChannelMember: ${memberCount}件`);
  
  await prisma.$disconnect();
}

main();
