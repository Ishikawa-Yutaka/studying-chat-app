/**
 * 参加可能なチャンネル一覧取得API
 *
 * GET /api/channels/available?userId=<authId> - 自分がまだ参加していないチャンネルを取得
 *
 * 処理の流れ:
 * 1. クエリパラメータからユーザーIDを取得
 * 2. Supabase認証でログインユーザーを確認
 * 3. ユーザーが参加しているチャンネルIDを取得
 * 4. 参加していないチャンネル（type="channel"のみ）を取得
 * 5. チャンネル一覧を返却
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📋 参加可能なチャンネル一覧取得API開始');

    // 1. クエリパラメータからユーザーID取得
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'ユーザーIDが必要です'
      }, { status: 400 });
    }

    console.log(`👤 参加可能チャンネル取得 - ユーザーID: ${userId}`);

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

    // authId とリクエストのuserIdが一致するか確認（セキュリティチェック）
    if (user.id !== userId) {
      console.error('❌ ユーザーID不一致');
      return NextResponse.json({
        success: false,
        error: '不正なリクエストです'
      }, { status: 403 });
    }

    console.log(`✅ 認証確認: ${user.email}`);

    // 3. Prismaでユーザーを検索
    const prismaUser = await prisma.user.findUnique({
      where: { authId: userId }
    });

    if (!prismaUser) {
      console.error('❌ Prismaユーザーが見つかりません');
      return NextResponse.json({
        success: false,
        error: 'ユーザーが見つかりません'
      }, { status: 404 });
    }

    console.log(`👤 Prismaユーザー確認: ${prismaUser.name} (内部ID: ${prismaUser.id})`);

    // 4. ユーザーが参加しているチャンネルIDを取得
    const joinedChannelMembers = await prisma.channelMember.findMany({
      where: {
        userId: prismaUser.id
      },
      select: {
        channelId: true
      }
    });

    const joinedChannelIds = joinedChannelMembers.map(member => member.channelId);

    console.log(`📊 参加済みチャンネル数: ${joinedChannelIds.length}件`);

    // 5. 参加していないチャンネル（type="channel"のみ）を取得
    const availableChannels = await prisma.channel.findMany({
      where: {
        type: 'channel', // DMは除外
        id: {
          notIn: joinedChannelIds // 参加していないチャンネルのみ
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // 新しいチャンネルから表示
      }
    });

    // レスポンス用にデータを整形
    const formattedChannels = availableChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      memberCount: channel.members.length,
      createdAt: channel.createdAt
    }));

    console.log(`✅ 参加可能なチャンネル取得成功: ${formattedChannels.length}件`);

    // 6. レスポンス返却
    return NextResponse.json({
      success: true,
      channels: formattedChannels,
      count: formattedChannels.length
    }, { status: 200 });

  } catch (error) {
    console.error('❌ 参加可能なチャンネル取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: '参加可能なチャンネルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
