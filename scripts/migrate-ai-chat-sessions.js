/**
 * AI会話データ移行スクリプト
 *
 * 既存のAiChatデータを新しいAiChatSessionモデルに移行します。
 *
 * 実行方法:
 * node scripts/migrate-ai-chat-sessions.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 AI会話データ移行開始...');

  try {
    // 1. 既存のAiChatデータを取得
    const existingChats = await prisma.$queryRaw`
      SELECT * FROM "AiChat" ORDER BY "createdAt" ASC
    `;

    if (existingChats.length === 0) {
      console.log('ℹ️  移行対象のデータがありません');
      return;
    }

    console.log(`📊 移行対象: ${existingChats.length}件のメッセージ`);

    // 2. ユーザーごとにグループ化
    const chatsByUser = {};
    existingChats.forEach(chat => {
      if (!chatsByUser[chat.userId]) {
        chatsByUser[chat.userId] = [];
      }
      chatsByUser[chat.userId].push(chat);
    });

    console.log(`👥 対象ユーザー数: ${Object.keys(chatsByUser).length}人`);

    // 3. 各ユーザーごとに新しいセッションを作成し、既存チャットを移行
    for (const [userId, chats] of Object.entries(chatsByUser)) {
      console.log(`\n📝 ユーザーID: ${userId} の${chats.length}件のメッセージを移行中...`);

      // 新しいセッションを作成（タイトルは最初のメッセージから）
      const firstMessage = chats[0].message;
      const title = firstMessage.length <= 30
        ? firstMessage
        : firstMessage.substring(0, 30) + '...';

      const session = await prisma.aiChatSession.create({
        data: {
          userId: userId,
          title: title,
          createdAt: chats[0].createdAt,
          updatedAt: chats[chats.length - 1].createdAt,
        }
      });

      console.log(`✅ セッション作成: "${title}" (ID: ${session.id})`);

      // 既存チャットにsessionIdを追加
      for (const chat of chats) {
        await prisma.$executeRaw`
          UPDATE "AiChat"
          SET "sessionId" = ${session.id}
          WHERE "id" = ${chat.id}
        `;
      }

      console.log(`✅ ${chats.length}件のメッセージをセッションに紐付けました`);
    }

    console.log('\n🎉 データ移行完了！');
    console.log(`\n📊 移行サマリー:`);
    console.log(`  - セッション数: ${Object.keys(chatsByUser).length}`);
    console.log(`  - メッセージ数: ${existingChats.length}`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
