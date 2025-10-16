// チャンネルメンバー管理API
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// チャンネルメンバー追加API（POST）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, userAuthId, inviterId } = body;
    
    console.log('👥 チャンネルメンバー追加:', { channelId, userAuthId, inviterId });
    
    // 入力検証
    if (!channelId || !userAuthId) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルIDとユーザーIDが必要です'
      }, { status: 400 });
    }
    
    // 招待されるユーザーを取得
    const targetUser = await prisma.user.findFirst({
      where: { authId: userAuthId }
    });
    
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: '招待対象のユーザーが見つかりません'
      }, { status: 404 });
    }
    
    // チャンネルの存在確認
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });
    
    if (!channel) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルが見つかりません'
      }, { status: 404 });
    }
    
    // 既にメンバーかチェック
    const existingMember = await prisma.channelMember.findFirst({
      where: {
        channelId: channelId,
        userId: targetUser.id
      }
    });
    
    if (existingMember) {
      return NextResponse.json({
        success: false,
        error: 'このユーザーは既にチャンネルのメンバーです'
      }, { status: 400 });
    }
    
    // メンバーを追加
    const newMember = await prisma.channelMember.create({
      data: {
        channelId: channelId,
        userId: targetUser.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            authId: true
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
    
    console.log(`✅ チャンネルメンバー追加成功: ${targetUser.name} → ${channel.name}`);
    
    return NextResponse.json({
      success: true,
      member: newMember,
      message: `${targetUser.name}を${channel.name}に招待しました`
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ チャンネルメンバー追加エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルメンバーの追加に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// チャンネルメンバー削除API（DELETE）
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, userAuthId, removerId } = body;
    
    console.log('👥 チャンネルメンバー削除:', { channelId, userAuthId, removerId });
    
    // 入力検証
    if (!channelId || !userAuthId) {
      return NextResponse.json({
        success: false,
        error: 'チャンネルIDとユーザーIDが必要です'
      }, { status: 400 });
    }
    
    // 削除対象ユーザーを取得
    const targetUser = await prisma.user.findFirst({
      where: { authId: userAuthId }
    });
    
    if (!targetUser) {
      return NextResponse.json({
        success: false,
        error: '削除対象のユーザーが見つかりません'
      }, { status: 404 });
    }
    
    // メンバーシップの存在確認
    const member = await prisma.channelMember.findFirst({
      where: {
        channelId: channelId,
        userId: targetUser.id
      },
      include: {
        channel: {
          select: {
            name: true
          }
        }
      }
    });
    
    if (!member) {
      return NextResponse.json({
        success: false,
        error: 'このユーザーはチャンネルのメンバーではありません'
      }, { status: 400 });
    }
    
    // メンバーを削除
    await prisma.channelMember.delete({
      where: {
        id: member.id
      }
    });
    
    console.log(`✅ チャンネルメンバー削除成功: ${targetUser.name} ← ${member.channel.name}`);
    
    return NextResponse.json({
      success: true,
      message: `${targetUser.name}を${member.channel.name}から削除しました`
    });
    
  } catch (error) {
    console.error('❌ チャンネルメンバー削除エラー:', error);

    return NextResponse.json({
      success: false,
      error: 'チャンネルメンバーの削除に失敗しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}