/**
 * スレッド機能テストデータ作成スクリプト
 *
 * 実行方法:
 * node scripts/create-thread-test-data.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 スレッドテストデータ作成開始...');

  try {
    // 1. ユーザーを取得
    const ishikawa = await prisma.user.findFirst({
      where: { email: 'yutaka.ishikawa.uni@gmail.com' }
    });

    const tanaka = await prisma.user.findFirst({
      where: { email: 'tanaka@example.com' }
    });

    const sato = await prisma.user.findFirst({
      where: { email: 'sato@example.com' }
    });

    if (!ishikawa || !tanaka || !sato) {
      console.error('❌ ユーザーが見つかりません');
      return;
    }

    console.log('✅ ユーザー取得成功');
    console.log(`  - ${ishikawa.name} (${ishikawa.email})`);
    console.log(`  - ${tanaka.name} (${tanaka.email})`);
    console.log(`  - ${sato.name} (${sato.email})`);

    // 2. 開発チャンネルを取得
    const devChannel = await prisma.channel.findFirst({
      where: {
        name: '開発',
        type: 'channel'
      }
    });

    if (!devChannel) {
      console.error('❌ 開発チャンネルが見つかりません');
      return;
    }

    console.log(`✅ チャンネル取得成功: ${devChannel.name}`);

    // 3. 親メッセージを作成（石川から）
    const parentMessage = await prisma.message.create({
      data: {
        content: 'スレッド機能のテストです。この質問に返信してください！',
        senderId: ishikawa.id,
        channelId: devChannel.id
      }
    });

    console.log(`✅ 親メッセージ作成成功: "${parentMessage.content}"`);

    // 4. スレッド返信を作成（田中から）
    const reply1 = await prisma.message.create({
      data: {
        content: 'わかりました！スレッドで返信しています。',
        senderId: tanaka.id,
        channelId: devChannel.id,
        parentMessageId: parentMessage.id  // 親メッセージIDを設定
      }
    });

    console.log(`✅ スレッド返信1作成成功: "${reply1.content}" (by ${tanaka.name})`);

    // 5. スレッド返信を作成（佐藤から）
    const reply2 = await prisma.message.create({
      data: {
        content: 'スレッド機能、いいですね！便利です。',
        senderId: sato.id,
        channelId: devChannel.id,
        parentMessageId: parentMessage.id  // 親メッセージIDを設定
      }
    });

    console.log(`✅ スレッド返信2作成成功: "${reply2.content}" (by ${sato.name})`);

    // 6. さらにスレッド返信を作成（石川から）
    const reply3 = await prisma.message.create({
      data: {
        content: 'ありがとうございます！皆さんの意見が聞けて良かったです。',
        senderId: ishikawa.id,
        channelId: devChannel.id,
        parentMessageId: parentMessage.id  // 親メッセージIDを設定
      }
    });

    console.log(`✅ スレッド返信3作成成功: "${reply3.content}" (by ${ishikawa.name})`);

    // 7. さらにスレッド返信を作成（田中から）
    const reply4 = await prisma.message.create({
      data: {
        content: '複数人でのスレッド会話もスムーズですね！',
        senderId: tanaka.id,
        channelId: devChannel.id,
        parentMessageId: parentMessage.id  // 親メッセージIDを設定
      }
    });

    console.log(`✅ スレッド返信4作成成功: "${reply4.content}" (by ${tanaka.name})`);

    console.log('\n🎉 スレッドテストデータ作成完了！');
    console.log(`親メッセージID: ${parentMessage.id}`);
    console.log(`スレッド返信数: 4件`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
