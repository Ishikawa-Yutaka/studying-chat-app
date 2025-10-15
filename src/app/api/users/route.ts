// ワークスペース内全ユーザー一覧取得API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ユーザー一覧取得API（GET）
export async function GET(request: NextRequest) {
  try {
    console.log('👥 ワークスペースユーザー一覧取得開始');
    
    // ワークスペース内の全ユーザーを取得
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        authId: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`✅ ユーザー一覧取得成功: ${users.length}件`);
    
    return NextResponse.json({
      success: true,
      users: users,
      count: users.length
    });
    
  } catch (error) {
    console.error('❌ ユーザー一覧取得エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'ユーザー一覧の取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}