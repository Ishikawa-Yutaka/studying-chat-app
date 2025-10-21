/**
 * ユーザー情報取得API
 * GET /api/user/[userId] - 特定のユーザー情報を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    console.log(`👤 ユーザー情報取得: ${userId}`);

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        name: true,
        email: true,
        authId: true,     // SupabaseのAuthIDも含める
        avatarUrl: true   // プロフィール画像のURL
      }
    });

    if (!user) {
      console.log(`❌ ユーザーが見つかりません: ${userId}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'ユーザーが見つかりません' 
        },
        { status: 404 }
      );
    }

    console.log(`✅ ユーザー情報取得成功: ${user.name}`);

    return NextResponse.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('❌ ユーザー情報取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ユーザー情報の取得に失敗しました' 
      },
      { status: 500 }
    );
  }
}