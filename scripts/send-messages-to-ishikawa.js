/**
 * 他のユーザーから石川裕にメッセージを送信するスクリプト
 * DMメッセージ統計の「受信」数を増やすためのテスト用
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sendMessages() {
  try {
    console.log('🔄 メッセージ送信開始...\n');

    // 石川裕を取得
    const ishikawa = await prisma.user.findFirst({
      where: { email: 'yutaka.ishikawa.uni@gmail.com' }
    });

    // 田中太郎を取得
    const tanaka = await prisma.user.findFirst({
      where: { email: 'tanaka@example.com' }
    });

    // 佐藤花子を取得
    const sato = await prisma.user.findFirst({
      where: { email: 'sato@example.com' }
    });

    if (!ishikawa || !tanaka || !sato) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }

    console.log('✅ ユーザー確認完了');
    console.log(`   石川裕: ${ishikawa.email}`);
    console.log(`   田中太郎: ${tanaka.email}`);
    console.log(`   佐藤花子: ${sato.email}\n`);

    // 石川裕と田中太郎のDMチャンネルを探す
    const dmWithTanaka = await prisma.channel.findFirst({
      where: {
        type: 'dm',
        AND: [
          { members: { some: { userId: ishikawa.id } } },
          { members: { some: { userId: tanaka.id } } }
        ]
      }
    });

    // 石川裕と佐藤花子のDMチャンネルを探す
    const dmWithSato = await prisma.channel.findFirst({
      where: {
        type: 'dm',
        AND: [
          { members: { some: { userId: ishikawa.id } } },
          { members: { some: { userId: sato.id } } }
        ]
      }
    });

    console.log('📨 メッセージ送信開始...\n');

    // 田中太郎から石川裕へメッセージ送信
    if (dmWithTanaka) {
      await prisma.message.create({
        data: {
          content: 'お疲れ様です！今日の会議の資料を確認しました。',
          senderId: tanaka.id,
          channelId: dmWithTanaka.id
        }
      });
      console.log('✅ 田中太郎 → 石川裕: メッセージ送信');

      await prisma.message.create({
        data: {
          content: '明日の打ち合わせの時間、15時に変更できますか？',
          senderId: tanaka.id,
          channelId: dmWithTanaka.id
        }
      });
      console.log('✅ 田中太郎 → 石川裕: メッセージ送信');

      await prisma.message.create({
        data: {
          content: 'よろしくお願いします！',
          senderId: tanaka.id,
          channelId: dmWithTanaka.id
        }
      });
      console.log('✅ 田中太郎 → 石川裕: メッセージ送信');
    } else {
      console.log('⚠️ 田中太郎とのDMチャンネルが見つかりません');
    }

    // 佐藤花子から石川裕へメッセージ送信
    if (dmWithSato) {
      await prisma.message.create({
        data: {
          content: 'こんにちは！新しいプロジェクトの件でご相談があります。',
          senderId: sato.id,
          channelId: dmWithSato.id
        }
      });
      console.log('✅ 佐藤花子 → 石川裕: メッセージ送信');

      await prisma.message.create({
        data: {
          content: 'お時間のある時に一度お話しできますか？',
          senderId: sato.id,
          channelId: dmWithSato.id
        }
      });
      console.log('✅ 佐藤花子 → 石川裕: メッセージ送信');

      await prisma.message.create({
        data: {
          content: '急ぎではないので、ご都合の良い時で大丈夫です。',
          senderId: sato.id,
          channelId: dmWithSato.id
        }
      });
      console.log('✅ 佐藤花子 → 石川裕: メッセージ送信');
    } else {
      console.log('⚠️ 佐藤花子とのDMチャンネルが見つかりません');
    }

    console.log('\n📊 完了しました！');
    console.log('\n次のステップ:');
    console.log('1. ブラウザで http://localhost:3001/workspace を開く');
    console.log('2. ダッシュボードの「DMメッセージ統計」を確認');
    console.log('3. 田中太郎と佐藤花子の「受信」数が増えていることを確認');
    console.log('4. DMページを開くと新しいメッセージが表示されます');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ エラー:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

sendMessages();
