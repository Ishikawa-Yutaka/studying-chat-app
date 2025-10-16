/**
 * テスト用チャンネル作成スクリプト
 *
 * 田中太郎ユーザーとして新しいチャンネルを作成し、
 * 石川裕ユーザーがそのチャンネルに参加できることをテストします
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestChannel() {
  try {
    console.log('🔄 テスト用チャンネル作成開始...');

    // 田中太郎ユーザーを取得
    const tanaka = await prisma.user.findUnique({
      where: { email: 'tanaka@example.com' }
    });

    if (!tanaka) {
      console.error('❌ 田中太郎ユーザーが見つかりません');
      return;
    }

    console.log(`👤 作成者: ${tanaka.name} (${tanaka.email})`);

    // 新しいチャンネルを作成
    const newChannel = await prisma.channel.create({
      data: {
        name: 'テスト用チャンネル',
        description: '石川さん、このチャンネルに参加してみてください！',
        type: 'channel',
        members: {
          create: {
            userId: tanaka.id
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    console.log('✅ テスト用チャンネル作成成功:');
    console.log(`   チャンネル名: ${newChannel.name}`);
    console.log(`   説明: ${newChannel.description}`);
    console.log(`   ID: ${newChannel.id}`);
    console.log(`   作成者: ${newChannel.members[0].user.name}`);
    console.log('');
    console.log('📋 次のステップ:');
    console.log('   1. ブラウザで http://localhost:3001/workspace にアクセス');
    console.log('   2. 「チャンネルを探す」ボタンをクリック');
    console.log('   3. 「テスト用チャンネル」が表示されることを確認');
    console.log('   4. 「参加」ボタンをクリック');
    console.log('   5. チャンネルページに遷移することを確認');

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestChannel();
