// DM チャンネル取得・作成API
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DMチャンネル取得API（GET）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ partnerId: string }> }
) {
  try {
    const { partnerId } = await params;
    const url = new URL(request.url);
    const myUserId = url.searchParams.get('myUserId');
    
    if (!myUserId) {
      return NextResponse.json({
        success: false,
        error: '現在のユーザーIDが必要です'
      }, { status: 400 });
    }
    
    console.log(`🔍 DM検索 - 自分: ${myUserId}, 相手: ${partnerId}`);
    
    // 相手のユーザー情報取得
    const partner = await prisma.user.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    if (!partner) {
      return NextResponse.json({
        success: false,
        error: 'DM相手が見つかりません'
      }, { status: 404 });
    }
    
    // 既存のDMチャンネルを検索（2人が参加しているDMタイプのチャンネル）
    const existingDmChannel = await prisma.channel.findFirst({
      where: {
        type: 'dm',
        members: {
          every: {
            OR: [
              { userId: myUserId },
              { userId: partnerId }
            ]
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
                email: true
              }
            }
          }
        }
      }
    });
    
    // 2人が参加しているDMチャンネルを確認
    const validDmChannel = existingDmChannel?.members.length === 2 &&
      existingDmChannel.members.some(m => m.userId === myUserId) &&
      existingDmChannel.members.some(m => m.userId === partnerId) 
      ? existingDmChannel : null;
    
    if (validDmChannel) {
      console.log(`✅ 既存DMチャンネル発見: ${validDmChannel.id}`);
      
      return NextResponse.json({
        success: true,
        dmChannel: {
          id: validDmChannel.id,
          type: validDmChannel.type,
          partner: partner
        }
      });
    }
    
    // DMチャンネルが存在しない場合は新規作成
    const newDmChannel = await prisma.channel.create({
      data: {
        type: 'dm',
        members: {
          create: [
            { userId: myUserId },
            { userId: partnerId }
          ]
        }
      },
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
    
    console.log(`✅ 新規DMチャンネル作成: ${newDmChannel.id}`);
    
    return NextResponse.json({
      success: true,
      dmChannel: {
        id: newDmChannel.id,
        type: newDmChannel.type,
        partner: partner
      },
      created: true
    });
    
  } catch (error) {
    console.error('❌ DM取得エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: 'DMチャンネルの取得に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}