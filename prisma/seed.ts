/**
 * Prisma Seed スクリプト
 *
 * 目的: E2Eテスト用のサンプルデータを直接データベースに投入する
 *
 * 使用方法:
 * npx tsx prisma/seed.ts
 *
 * 作成されるデータ:
 * - テスト用ユーザー (user1, user2, user3)
 * - サンプルチャンネル (一般, 開発, ランダム)
 * - サンプルメッセージ
 * - DMチャンネル
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルから環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed開始: テストデータを投入します...');

  // 既存の全ユーザーを取得（Supabase Authで認証済みのユーザー含む）
  const allExistingUsers = await prisma.user.findMany();
  console.log(`📊 既存ユーザー数: ${allExistingUsers.length}人`);

  // テスト用ユーザーを作成（既存ユーザーがいない場合のみ）
  const userData = [
    { name: 'テストユーザー1', email: 'test1@example.com', authId: `test-auth-${Date.now()}-1` },
    { name: 'テストユーザー2', email: 'test2@example.com', authId: `test-auth-${Date.now()}-2` },
    { name: 'テストユーザー3', email: 'test3@example.com', authId: `test-auth-${Date.now()}-3` }
  ];

  const createdUsers = [];
  for (const user of userData) {
    // 既存ユーザーをチェック
    let existingUser = await prisma.user.findFirst({
      where: { email: user.email }
    });

    if (!existingUser) {
      existingUser = await prisma.user.create({
        data: {
          authId: user.authId,
          name: user.name,
          email: user.email,
          lastSeen: new Date()
        }
      });
      console.log(`✅ ユーザー「${existingUser.name}」を作成しました`);
    } else {
      console.log(`⏭️  ユーザー「${user.name}」は既に存在します`);
    }

    createdUsers.push(existingUser);
  }

  // 全ユーザー（既存 + 新規作成）を統合
  const allUsers = [...allExistingUsers, ...createdUsers.filter(u => !allExistingUsers.some(e => e.id === u.id))];
  console.log(`📊 全ユーザー数: ${allUsers.length}人`);

  // サンプルチャンネルを作成
  const channelData = [
    {
      name: '一般',
      description: '雑談・お知らせなど、なんでもOKのチャンネルです',
      type: 'channel'
    },
    {
      name: '開発',
      description: '開発に関する議論・質問・進捗報告',
      type: 'channel'
    },
    {
      name: 'ランダム',
      description: '趣味・娯楽・オフトピックな話題はこちら',
      type: 'channel'
    }
  ];

  const createdChannels = [];
  for (const channelInfo of channelData) {
    // 既存チャンネルをチェック
    let existingChannel = await prisma.channel.findFirst({
      where: {
        name: channelInfo.name,
        type: 'channel'
      }
    });

    if (!existingChannel) {
      // チャンネルを作成し、全ユーザーをメンバーに追加
      existingChannel = await prisma.channel.create({
        data: {
          name: channelInfo.name,
          description: channelInfo.description,
          type: channelInfo.type,
          members: {
            create: allUsers.map(user => ({
              userId: user.id
            }))
          }
        }
      });
      console.log(`✅ チャンネル「${existingChannel.name}」を作成しました（メンバー: ${allUsers.length}人）`);
    } else {
      console.log(`⏭️  チャンネル「${channelInfo.name}」は既に存在します`);

      // 既存チャンネルに全ユーザーを一括追加（まだメンバーでない場合）
      const existingMemberIds = await prisma.channelMember.findMany({
        where: { channelId: existingChannel.id },
        select: { userId: true }
      }).then(members => members.map(m => m.userId));

      const newMembers = allUsers
        .filter(user => !existingMemberIds.includes(user.id))
        .map(user => ({
          userId: user.id,
          channelId: existingChannel.id
        }));

      if (newMembers.length > 0) {
        await prisma.channelMember.createMany({
          data: newMembers
        });
        console.log(`✅ ${newMembers.length}人のユーザーをチャンネル「${channelInfo.name}」に追加しました`);
      }
    }

    createdChannels.push(existingChannel);
  }

  // 各チャンネルにサンプルメッセージを作成
  const channelMessages: { [key: string]: string[] } = {
    '一般': [
      'おはようございます！',
      'こんにちは、今日もよろしくお願いします',
      'お疲れ様です',
      '週末はどう過ごされましたか？',
    ],
    '開発': [
      'Next.js 15の新機能について調べてます',
      'Prismaのマイグレーションが完了しました',
      'リアルタイム通信の実装、順調です',
      'テストカバレッジが60%を超えました',
    ],
    'ランダム': [
      '最近読んだ本でおすすめありますか？',
      '週末に映画を観に行きました',
      'コーヒーブレイクしませんか？',
      '新しいカフェ見つけました',
    ]
  };

  let totalMessages = 0;
  for (const channel of createdChannels) {
    // このチャンネルに既にメッセージがあるかチェック
    const existingMessageCount = await prisma.message.count({
      where: { channelId: channel.id }
    });

    if (existingMessageCount > 0) {
      console.log(`⏭️  チャンネル「${channel.name}」には既に${existingMessageCount}件のメッセージがあります`);
      totalMessages += existingMessageCount;
      continue;
    }

    // チャンネル名に対応するメッセージを取得
    const messages = channelMessages[channel.name || ''] || [];

    // サンプルメッセージを一括作成
    if (messages.length > 0 && allUsers.length > 0) {
      await prisma.message.createMany({
        data: messages.map((content, i) => ({
          content,
          senderId: allUsers[i % allUsers.length].id,
          channelId: channel.id,
          createdAt: new Date(Date.now() - (messages.length - i) * 60000)
        }))
      });
      totalMessages += messages.length;
      console.log(`✅ チャンネル「${channel.name}」に${messages.length}件のメッセージを作成しました`);
    }
  }

  // DMチャンネルを作成（2人以上いる場合）
  let dmChannelCreated = false;
  if (allUsers.length >= 2) {
    const user1 = allUsers[0];
    const user2 = allUsers[1];

    // 既存のDMチャンネルをチェック
    const existingDM = await prisma.channel.findFirst({
      where: {
        type: 'dm',
        AND: [
          { members: { some: { userId: user1.id } } },
          { members: { some: { userId: user2.id } } }
        ]
      }
    });

    if (!existingDM) {
      const dmChannel = await prisma.channel.create({
        data: {
          type: 'dm',
          name: null,
          description: null,
          members: {
            create: [
              { userId: user1.id },
              { userId: user2.id }
            ]
          }
        }
      });

      // DMにサンプルメッセージを作成
      const dmMessages = [
        { content: 'DMのテストメッセージです', senderId: user1.id },
        { content: 'DMで返信しました', senderId: user2.id },
      ];

      await prisma.message.createMany({
        data: dmMessages.map((msg, i) => ({
          content: msg.content,
          senderId: msg.senderId,
          channelId: dmChannel.id,
          createdAt: new Date(Date.now() - (dmMessages.length - i) * 30000)
        }))
      });

      totalMessages += dmMessages.length;
      dmChannelCreated = true;
      console.log(`✅ DMチャンネルを作成しました（${user1.name} ⇔ ${user2.name}）`);
    } else {
      console.log(`⏭️  DMチャンネルは既に存在します`);
    }
  }

  console.log('🎉 Seed完了！');
  console.log(`📊 作成されたデータ:`);
  console.log(`  - ユーザー: ${allUsers.length}人（既存: ${allExistingUsers.length}人、新規: ${createdUsers.filter(u => !allExistingUsers.some(e => e.id === u.id)).length}人）`);
  console.log(`  - チャンネル: ${createdChannels.length}個`);
  console.log(`  - メッセージ: ${totalMessages}件`);
  console.log(`  - DM: ${dmChannelCreated ? '1個' : '0個（既存）'}`);
}

main()
  .catch((e) => {
    console.error('❌ Seedエラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
