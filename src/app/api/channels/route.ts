// チャンネル一覧取得・作成API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { channelMemberUserSelect } from '@/lib/prisma-selectors';

// チャンネル一覧取得API（GET）
export async function GET(request: NextRequest) {
  try {
    console.log('📋 チャンネル一覧取得開始');

    // 認証チェック：現在ログインしているユーザーを取得
    const { user, error: authError, status: authStatus } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError
      }, { status: authStatus });
    }
    
    console.log('📋 チャンネルメンバー検索開始...');
    // パフォーマンス最適化: メンバー数は_countで取得、DM相手の情報のみ取得
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
            creatorId: true,
            // メンバー数のみカウント（全メンバーデータを取得しない）
            _count: {
              select: { members: true }
            },
            // DM用に相手のユーザー情報のみ取得（1件のみ）
            members: {
              where: {
                userId: { not: user.id }
              },
              take: 1,
              select: {
                user: {
                  select: channelMemberUserSelect
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
          memberCount: channel._count.members,  // _countを使用
          creatorId: channel.creatorId  // チャンネル作成者のID
        });
      } else if (channel.type === 'dm') {
        // DM - 相手のユーザー情報を取得（1件のみ取得済み）
        const partner = channel.members[0];
        if (partner) {
          directMessages.push({
            id: channel.id,
            partnerId: partner.user.authId,     // Supabase AuthID を使用
            partnerName: partner.user.name,
            partnerEmail: partner.user.email,
            partnerAvatarUrl: partner.user.avatarUrl,  // プロフィール画像のURL
            lastSeen: partner.user.lastSeen     // 最終ログイン時刻（オンライン状態はPresenceで取得）
          });
        }
      }
    }
    
    console.log(`✅ チャンネル取得成功 - 通常: ${channels.length}件, DM: ${directMessages.length}件`);

    // 現在のユーザー情報も返す（avatarUrlを含む）
    const currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      authId: user.authId,
      avatarUrl: user.avatarUrl
    };

    return NextResponse.json({
      success: true,
      channels: channels,
      directMessages: directMessages,
      currentUser: currentUser,  // 現在のユーザー情報（認証トークンから取得）
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

    // 1. 認証チェック：現在ログインしているユーザーを取得
    const { user, error: authError, status: authStatus } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError
      }, { status: authStatus });
    }

    // 2. リクエストボディ取得
    const body = await request.json();
    const { name, description } = body;

    // 3. バリデーション: チャンネル名は必須
    if (!name || name.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'チャンネル名を入力してください'
      }, { status: 400 });
    }

    console.log(`📝 チャンネル作成リクエスト - 名前: ${name}, ユーザー: ${user.name}`);

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
        creatorId: user.id, // チャンネル作成者のIDを保存
        members: {
          create: {
            userId: user.id // 認証済みユーザーを自動的にメンバーに追加
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
          name: user.name,
          email: user.email
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