/**
 * チャンネル参加API
 *
 * POST /api/channels/join - 指定したチャンネルに参加
 *
 * リクエストボディ:
 * {
 *   channelId: string  // 参加するチャンネルのID
 *   userId: string     // ユーザーのauthId (Supabase)
 * }
 *
 * 処理の流れ:
 * 1. リクエストボディからchannelIdとuserIdを取得
 * 2. Supabase認証でログインユーザーを確認
 * 3. チャンネルが存在するか確認
 * 4. 既に参加していないか確認
 * 5. ChannelMemberレコードを作成してチャンネルに参加
 * 6. 成功レスポンスを返却
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 チャンネル参加API開始');

    // 1. リクエストボディ取得
    const body = await request.json();
    const { channelId, userId } = body;

    if (!channelId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルIDとユーザーIDが必要です'
      }, { status: 400 });
    }

    console.log(`📝 チャンネル参加リクエスト - チャンネルID: ${channelId}, ユーザーID: ${userId}`);

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

    console.log(`✅ 認証確認: ${user.email} (authId: ${user.id})`);

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

    // 4. チャンネルが存在するか確認
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: {
            userId: prismaUser.id
          }
        }
      }
    });

    if (!channel) {
      console.error('❌ チャンネルが見つかりません');
      return NextResponse.json({
        success: false,
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }

    // DMチャンネルには参加できない
    if (channel.type === 'dm') {
      return NextResponse.json({
        success: false,
        error: 'DMチャンネルには参加できません'
      }, { status: 403 });
    }

    // 5. 既に参加していないか確認
    if (channel.members.length > 0) {
      console.log('⚠️ 既にこのチャンネルに参加しています');
      return NextResponse.json({
        success: false,
        error: '既にこのチャンネルに参加しています'
      }, { status: 409 });
    }

    console.log(`🔄 チャンネル参加実行: ${channel.name}`);

    // 6. ChannelMemberレコードを作成
    const newMember = await prisma.channelMember.create({
      data: {
        userId: prismaUser.id,
        channelId: channelId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        channel: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    console.log(`✅ チャンネル参加成功: ${newMember.channel.name} (ID: ${channelId})`);

    // 7. レスポンス返却
    return NextResponse.json({
      success: true,
      message: 'チャンネルに参加しました',
      member: newMember,
      channelId: channelId,
      channelName: channel.name
    }, { status: 200 });

  } catch (error) {
    console.error('❌ チャンネル参加エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルへの参加に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
