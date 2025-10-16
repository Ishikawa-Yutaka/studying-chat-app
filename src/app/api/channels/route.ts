// チャンネル一覧取得・作成API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// チャンネル一覧取得API（GET）
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーIDが必要です'
      }, { status: 400 });
    }
    
    console.log(`📋 チャンネル一覧取得 - ユーザーID: ${userId}`);
    
    // SupabaseのauthIdからPrismaのユーザー内部IDを取得
    const user = await prisma.user.findFirst({
      where: { authId: userId }
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーが見つかりません'
      }, { status: 404 });
    }
    
    console.log(`👤 Prismaユーザー確認: ${user.name} (内部ID: ${user.id})`);
    
    console.log('📋 チャンネルメンバー検索開始...');
    // ユーザーが参加しているチャンネルを取得
    const userChannels = await prisma.channelMember.findMany({
      where: {
        userId: user.id
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    authId: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    console.log('✅ チャンネルメンバー検索完了:', userChannels.length, '件');
    
    // 通常のチャンネルとDMを分離
    const channels = [];
    const directMessages = [];
    
    for (const userChannel of userChannels) {
      const channel = userChannel.channel;
      
      if (channel.type === 'channel') {
        // 通常のチャンネル
        channels.push({
          id: channel.id,
          name: channel.name,
          description: channel.description,
          memberCount: channel.members.length
        });
      } else if (channel.type === 'dm') {
        // DM - 相手のユーザー情報を取得
        const partner = channel.members.find(member => member.userId !== user.id);
        if (partner) {
          directMessages.push({
            id: channel.id,
            partnerId: partner.user.authId, // Supabase AuthID を使用
            partnerName: partner.user.name,
            partnerEmail: partner.user.email
          });
        }
      }
    }
    
    console.log(`✅ チャンネル取得成功 - 通常: ${channels.length}件, DM: ${directMessages.length}件`);
    
    return NextResponse.json({
      success: true,
      channels: channels,
      directMessages: directMessages,
      counts: {
        channels: channels.length,
        directMessages: directMessages.length
      }
    });
    
  } catch (error) {
    console.error('❌ チャンネル取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * チャンネル作成API（POST）
 *
 * 処理の流れ:
 * 1. リクエストボディからチャンネル名・説明を取得
 * 2. Supabase認証でログインユーザーを確認
 * 3. 新しいチャンネルをデータベースに作成
 * 4. 作成者を自動的にチャンネルメンバーに追加
 * 5. 作成したチャンネル情報を返却
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 チャンネル作成API開始');

    // 1. リクエストボディ取得
    const body = await request.json();
    const { name, description } = body;

    // バリデーション: チャンネル名は必須
    if (!name || name.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'チャンネル名を入力してください'
      }, { status: 400 });
    }

    console.log(`📝 チャンネル作成リクエスト - 名前: ${name}`);

    // 2. Supabase認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ 認証エラー:', authError);
      return NextResponse.json({
        success: false,
        error: '認証が必要です。ログインしてください。'
      }, { status: 401 });
    }

    console.log(`✅ 認証確認: ${user.email} (authId: ${user.id})`);

    // 3. SupabaseのauthIdからPrismaユーザーを取得
    const prismaUser = await prisma.user.findFirst({
      where: { authId: user.id }
    });

    if (!prismaUser) {
      console.error('❌ Prismaユーザーが見つかりません');
      return NextResponse.json({
        success: false,
        error: 'ユーザー情報が見つかりません'
      }, { status: 404 });
    }

    console.log(`👤 Prismaユーザー確認: ${prismaUser.name} (内部ID: ${prismaUser.id})`);

    // 4. 同名チャンネルが存在しないか確認
    const existingChannel = await prisma.channel.findFirst({
      where: {
        name: name.trim(),
        type: 'channel'
      }
    });

    if (existingChannel) {
      return NextResponse.json({
        success: false,
        error: 'このチャンネル名は既に使用されています'
      }, { status: 409 });
    }

    // 5. チャンネル作成 + 作成者をメンバーに追加（トランザクション）
    const newChannel = await prisma.channel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: 'channel',
        members: {
          create: {
            userId: prismaUser.id // 作成者を自動的にメンバーに追加
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                authId: true
              }
            }
          }
        }
      }
    });

    console.log(`✅ チャンネル作成成功: ${newChannel.name} (ID: ${newChannel.id})`);

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      channel: {
        id: newChannel.id,
        name: newChannel.name,
        description: newChannel.description,
        memberCount: newChannel.members.length,
        createdBy: {
          name: prismaUser.name,
          email: prismaUser.email
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ チャンネル作成エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルの作成に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}