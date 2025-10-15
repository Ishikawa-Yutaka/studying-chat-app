// 認証ユーザー用のテストデータ作成API
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('🌱 認証ユーザー用テストデータ作成開始...');
    
    // 正しいSupabase AuthID
    const supabaseAuthId = '240ddd9e-c69c-4b62-b9f2-73e3f384ea90';
    
    // 既存の石川さんのデータを削除（重複を避けるため）
    await prisma.user.deleteMany({
      where: {
        email: 'yutaka.ishikawa.uni@gmail.com'
      }
    });
    console.log('🗑️ 既存ユーザーデータ削除完了');
    
    // 正しいauthIdで石川さんのユーザーを作成
    const authUser = await prisma.user.create({
      data: {
        name: '石川 裕',
        email: 'yutaka.ishikawa.uni@gmail.com',
        authId: supabaseAuthId // 正しいSupabase AuthID
      }
    });
    console.log('✅ 石川さんのPrismaユーザー作成完了:', authUser.name, 'authId:', authUser.authId);

    console.log('👤 認証ユーザー確認:', authUser.name, authUser.email);

    // 既存のチャンネルデータをクリア（メッセージは保持）
    await prisma.channelMember.deleteMany();
    await prisma.channel.deleteMany();
    
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
          name: 'テスト',
          description: '機能テスト用のチャンネルです',
          type: 'channel'
        }
      })
    ]);
    
    console.log(`📺 チャンネル作成完了: ${channels.length}個`);
    
    // 認証ユーザーを全チャンネルに参加させる
    const channelMembers = await Promise.all([
      prisma.channelMember.create({
        data: { userId: authUser.id, channelId: channels[0].id }
      }),
      prisma.channelMember.create({
        data: { userId: authUser.id, channelId: channels[1].id }
      }),
      prisma.channelMember.create({
        data: { userId: authUser.id, channelId: channels[2].id }
      })
    ]);
    
    console.log(`🔗 チャンネルメンバー関係作成完了: ${channelMembers.length}件`);
    
    // 各チャンネルにウェルカムメッセージを作成
    const messages = await Promise.all([
      prisma.message.create({
        data: {
          content: 'チャンネルが作成されました！認証テストを開始してください。',
          senderId: authUser.id,
          channelId: channels[0].id
        }
      }),
      prisma.message.create({
        data: {
          content: '開発チャンネルです。技術的な議論をここで行いましょう。',
          senderId: authUser.id,
          channelId: channels[1].id
        }
      }),
      prisma.message.create({
        data: {
          content: 'テスト用チャンネルです。機能の動作確認にご利用ください。',
          senderId: authUser.id,
          channelId: channels[2].id
        }
      })
    ]);
    
    console.log(`💬 ウェルカムメッセージ作成完了: ${messages.length}件`);
    
    const result = {
      success: true,
      message: `${authUser.name}さん用のテストデータ作成完了`,
      created: {
        channels: channels.length,
        channelMembers: channelMembers.length,
        messages: messages.length
      },
      user: {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email
      },
      channels: channels.map(c => ({ id: c.id, name: c.name, type: c.type }))
    };
    
    console.log('🎉 認証ユーザー用テストデータ作成完了！', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'テストデータの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}