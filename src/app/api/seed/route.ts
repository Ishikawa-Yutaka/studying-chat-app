/**
 * Seed API - テストデータ一括投入
 *
 * 目的: 開発・テスト用のサンプルデータを一括で作成する
 *
 * 使用方法:
 * curl -X POST http://localhost:3000/api/seed
 *
 * 作成されるデータ:
 * - テスト用の仮ユーザー3人（Prisma DBのみ、ログイン不可）
 * - サンプルチャンネル（3つ）
 * - 全ユーザー（既存+仮）をチャンネルに追加
 * - サンプルメッセージ（各チャンネルに複数件）
 * - DMチャンネル（既存ユーザー間）
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('🌱 Seed開始: テストデータを投入します...');

    // 既存ユーザーを取得
    const existingUsers = await prisma.user.findMany();
    console.log(`📊 既存ユーザー数: ${existingUsers.length}人`);

    // テスト用の仮ユーザーを3人作成（Prisma DBのみ、ログイン不可）
    const fakeUserData = [
      { name: '山田太郎', email: 'yamada@example.com', authId: `fake-auth-${Date.now()}-1` },
      { name: '佐藤花子', email: 'sato@example.com', authId: `fake-auth-${Date.now()}-2` },
      { name: '鈴木一郎', email: 'suzuki@example.com', authId: `fake-auth-${Date.now()}-3` }
    ];

    const createdFakeUsers = [];
    for (const userData of fakeUserData) {
      // 同じメールアドレスが既に存在するかチェック
      const existingUser = await prisma.user.findFirst({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⏭️  ユーザー「${userData.name}」は既に存在します`);
        createdFakeUsers.push(existingUser);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          authId: userData.authId,
          name: userData.name,
          email: userData.email,
          lastSeen: new Date()
        }
      });

      createdFakeUsers.push(user);
      console.log(`✅ 仮ユーザー「${user.name}」を作成しました`);
    }

    // 全ユーザー（既存+仮）
    const allUsers = [...existingUsers, ...createdFakeUsers];
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
      // チャンネルが既に存在するかチェック
      const existingChannel = await prisma.channel.findFirst({
        where: {
          name: channelInfo.name,
          type: 'channel'
        }
      });

      if (existingChannel) {
        console.log(`⏭️  チャンネル「${channelInfo.name}」は既に存在します`);

        // 既存チャンネルに新しいユーザーを追加
        for (const user of createdFakeUsers) {
          const isMember = await prisma.channelMember.findFirst({
            where: {
              userId: user.id,
              channelId: existingChannel.id
            }
          });

          if (!isMember) {
            await prisma.channelMember.create({
              data: {
                userId: user.id,
                channelId: existingChannel.id
              }
            });
            console.log(`✅ ${user.name}をチャンネル「${channelInfo.name}」に追加しました`);
          }
        }

        createdChannels.push(existingChannel);
        continue;
      }

      // チャンネルを作成し、全ユーザーをメンバーに追加
      const channel = await prisma.channel.create({
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

      createdChannels.push(channel);
      console.log(`✅ チャンネル「${channel.name}」を作成しました（メンバー: ${allUsers.length}人）`);
    }

    // 各チャンネルにサンプルメッセージを作成（チャンネルごとに異なる内容）
    const channelMessages: { [key: string]: string[] } = {
      '一般': [
        'おはようございます！',
        'こんにちは、今日もよろしくお願いします',
        'お疲れ様です',
        '週末はどう過ごされましたか？',
        '今日はいい天気ですね',
        'ランチはどこに行きますか？',
        '今週の予定を共有します',
        'よろしくお願いします'
      ],
      '開発': [
        'Next.js 15の新機能について調べてます',
        'Prismaのマイグレーションが完了しました',
        'リアルタイム通信の実装、順調です',
        'テストカバレッジが60%を超えました',
        'デプロイ前にコードレビューお願いします',
        'バグ修正のPRを作成しました',
        '新しいAPIエンドポイントを追加しました',
        'パフォーマンス最適化を検討中です'
      ],
      'ランダム': [
        '最近読んだ本でおすすめありますか？',
        '週末に映画を観に行きました',
        'コーヒーブレイクしませんか？',
        '新しいカフェ見つけました',
        '趣味で写真を始めました',
        '音楽の話をしましょう',
        'おすすめのゲームありますか？',
        'ペットの写真を共有します'
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
      const messages = channelMessages[channel.name || ''] || channelMessages['一般'];

      // サンプルメッセージを作成（様々なユーザーから）
      for (let i = 0; i < messages.length; i++) {
        const randomUser = allUsers[i % allUsers.length];
        await prisma.message.create({
          data: {
            content: messages[i],
            senderId: randomUser.id,
            channelId: channel.id,
            createdAt: new Date(Date.now() - (messages.length - i) * 60000) // 1分ずつ古くする
          }
        });
        totalMessages++;
      }
      console.log(`✅ チャンネル「${channel.name}」に${messages.length}件のメッセージを作成しました`);
    }

    // DMチャンネルを作成（既存ユーザーが2人以上いる場合）
    let dmChannelCreated = false;
    if (existingUsers.length >= 2) {
      // 既存のDMチャンネルをチェック
      const user1 = existingUsers[0];
      const user2 = existingUsers[1];

      const existingDM = await prisma.channel.findFirst({
        where: {
          type: 'dm',
          AND: [
            { members: { some: { userId: user1.id } } },
            { members: { some: { userId: user2.id } } }
          ]
        },
        include: {
          members: true
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
          { content: 'よろしくお願いします', senderId: user1.id },
          { content: 'こちらこそ！', senderId: user2.id }
        ];

        for (let i = 0; i < dmMessages.length; i++) {
          await prisma.message.create({
            data: {
              content: dmMessages[i].content,
              senderId: dmMessages[i].senderId,
              channelId: dmChannel.id,
              createdAt: new Date(Date.now() - (dmMessages.length - i) * 30000) // 30秒ずつ古くする
            }
          });
          totalMessages++;
        }

        dmChannelCreated = true;
        console.log(`✅ DMチャンネルを作成しました（${user1.name} ⇔ ${user2.name}）`);
      } else {
        console.log(`⏭️  DMチャンネルは既に存在します`);
      }
    }

    console.log('🎉 Seed完了！');

    return NextResponse.json({
      success: true,
      message: 'テストデータを投入しました',
      data: {
        existingUserCount: existingUsers.length,
        fakeUserCount: createdFakeUsers.length,
        totalUserCount: allUsers.length,
        channelCount: createdChannels.length,
        messageCount: totalMessages,
        dmCreated: dmChannelCreated
      }
    });

  } catch (error) {
    console.error('❌ Seedエラー:', error);
    return NextResponse.json({
      success: false,
      error: 'テストデータの投入に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
