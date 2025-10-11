// データベース接続テスト用API
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('🔌 データベース接続テスト開始...');
    
    // データベース接続テスト
    await prisma.$connect();
    console.log('✅ データベース接続成功！');
    
    // テーブル存在確認
    const userCount = await prisma.user.count();
    const channelCount = await prisma.channel.count();
    const messageCount = await prisma.message.count();
    const channelMemberCount = await prisma.channelMember.count();
    
    const result = {
      success: true,
      message: 'データベース接続成功',
      tables: {
        users: userCount,
        channels: channelCount,
        messages: messageCount,
        channelMembers: channelMemberCount
      }
    };
    
    console.log('🎉 データベーステスト完了！', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ データベースエラー:', error);
    
    return NextResponse.json({
      success: false,
      message: 'データベース接続エラー',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}