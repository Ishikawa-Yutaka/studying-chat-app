// デバッグ用：ユーザー情報確認API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const authId = url.searchParams.get('authId');
    
    console.log('🔍 デバッグ - ユーザー検索:', authId);
    
    // 全ユーザー一覧
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        authId: true,
        createdAt: true
      }
    });
    
    console.log('👥 全ユーザー一覧:', allUsers);
    
    // 特定のauthIdのユーザー検索
    let targetUser = null;
    if (authId) {
      targetUser = await prisma.user.findFirst({
        where: { authId },
        select: {
          id: true,
          name: true,
          email: true,
          authId: true,
          createdAt: true
        }
      });
      console.log('🎯 指定ユーザー:', targetUser);
    }
    
    return NextResponse.json({
      success: true,
      allUsers,
      targetUser,
      searchAuthId: authId
    });
    
  } catch (error) {
    console.error('❌ デバッグAPIエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}