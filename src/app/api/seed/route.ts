// テストデータ作成API
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    console.log('🌱 テストデータ作成開始...');
    
    // 既存データのクリア（開発用）
    await prisma.message.deleteMany();
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    await prisma.user.deleteMany();
    
    // テストユーザー作成
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: '田中太郎',
          email: 'tanaka@example.com',
          authId: 'auth_tanaka_123'
        }
      }),
      prisma.user.create({
        data: {
          name: '佐藤花子',
          email: 'sato@example.com',
          authId: 'auth_sato_123'
        }
      }),
      prisma.user.create({
        data: {
          name: '鈴木一郎',
          email: 'suzuki@example.com',
          authId: 'auth_suzuki_123'
        }
      })
    ]);
    
    console.log(`👥 ユーザー作成完了: ${users.length}人`);
    
    // テストチャンネル作成
    const channels = await Promise.all([
      prisma.channel.create({
        data: {
          name: '一般',
          description: '一般的な話題について話し合うチャンネルです',
          type: 'channel'
        }
      }),
      prisma.channel.create({
        data: {
          name: '開発',
          description: '開発に関する議論をするチャンネルです',
          type: 'channel'
        }
      }),
      prisma.channel.create({
        data: {
          type: 'dm'  // DM（名前と説明はnull）
        }
      })
    ]);
    
    console.log(`📺 チャンネル作成完了: ${channels.length}個`);
    
    // チャンネルメンバー関係作成
    const channelMembers = await Promise.all([
      // 一般チャンネル - 全員参加
      prisma.channelMember.create({
        data: { userId: users[0].id, channelId: channels[0].id }
      }),
      prisma.channelMember.create({
        data: { userId: users[1].id, channelId: channels[0].id }
      }),
      prisma.channelMember.create({
        data: { userId: users[2].id, channelId: channels[0].id }
      }),
      
      // 開発チャンネル - 田中と佐藤のみ
      prisma.channelMember.create({
        data: { userId: users[0].id, channelId: channels[1].id }
      }),
      prisma.channelMember.create({
        data: { userId: users[1].id, channelId: channels[1].id }
      }),
      
      // DM - 田中と佐藤
      prisma.channelMember.create({
        data: { userId: users[0].id, channelId: channels[2].id }
      }),
      prisma.channelMember.create({
        data: { userId: users[1].id, channelId: channels[2].id }
      })
    ]);
    
    console.log(`🔗 チャンネルメンバー関係作成完了: ${channelMembers.length}件`);
    
    // テストメッセージ作成
    const messages = await Promise.all([
      // 一般チャンネルのメッセージ
      prisma.message.create({
        data: {
          content: 'こんにちは！よろしくお願いします。',
          senderId: users[0].id,
          channelId: channels[0].id
        }
      }),
      prisma.message.create({
        data: {
          content: 'こちらこそ、よろしくお願いします！',
          senderId: users[1].id,
          channelId: channels[0].id
        }
      }),
      prisma.message.create({
        data: {
          content: '今日はいい天気ですね。',
          senderId: users[2].id,
          channelId: channels[0].id
        }
      }),
      
      // 開発チャンネルのメッセージ
      prisma.message.create({
        data: {
          content: 'データベース接続が完了しました！',
          senderId: users[0].id,
          channelId: channels[1].id
        }
      }),
      prisma.message.create({
        data: {
          content: '素晴らしいですね！次はAPIの実装ですね。',
          senderId: users[1].id,
          channelId: channels[1].id
        }
      }),
      
      // DMのメッセージ
      prisma.message.create({
        data: {
          content: 'お疲れ様です。個別にお話があります。',
          senderId: users[0].id,
          channelId: channels[2].id
        }
      }),
      prisma.message.create({
        data: {
          content: 'はい、何でしょうか？',
          senderId: users[1].id,
          channelId: channels[2].id
        }
      })
    ]);
    
    console.log(`💬 メッセージ作成完了: ${messages.length}件`);
    
    const result = {
      success: true,
      message: 'テストデータ作成完了',
      created: {
        users: users.length,
        channels: channels.length,
        channelMembers: channelMembers.length,
        messages: messages.length
      },
      data: {
        users: users.map(u => ({ id: u.id, name: u.name })),
        channels: channels.map(c => ({ id: c.id, name: c.name, type: c.type }))
      }
    };
    
    console.log('🎉 テストデータ作成完了！', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'テストデータの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}