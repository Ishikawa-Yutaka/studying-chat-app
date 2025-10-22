// 単一チャンネル情報取得API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, checkChannelMembership } from '@/lib/auth-server';

/**
 * チャンネル情報取得API（GET）
 *
 * セキュリティ強化版:
 * - 認証チェック：ログインしているユーザーのみアクセス可能
 * - メンバーシップ確認：参加しているチャンネルのみ情報取得可能
 * - 未参加のチャンネルは絶対に見れない
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;

    console.log(`📋 チャンネル情報取得 - チャンネルID: ${channelId}`);

    // 1. 認証チェック：現在ログインしているユーザーを取得
    const { user, error: authError, status: authStatus } = await getCurrentUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: authError
      }, { status: authStatus });
    }

    // 2. メンバーシップ確認：このユーザーがこのチャンネルのメンバーか確認
    const { isMember, error: memberError, status: memberStatus } = await checkChannelMembership(user.id, channelId);

    if (!isMember) {
      return NextResponse.json({
        success: false,
        error: memberError
      }, { status: memberStatus });
    }

    // 3. メンバーであることが確認できたので、チャンネル情報を取得
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });
    
    if (!channel) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }
    
    console.log(`✅ チャンネル情報取得成功: ${channel.name}`);
    
    return NextResponse.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: channel.type,
        memberCount: channel.members.length,
        members: channel.members.map(member => member.user)
      }
    });
    
  } catch (error) {
    console.error('❌ チャンネル情報取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネル情報の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}