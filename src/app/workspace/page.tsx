/**
 * ワークスペースダッシュボード
 * 
 * チャットアプリのメイン画面
 * 統計情報、チャンネル一覧、最近のアクティビティを表示
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Hash, MessageSquare, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WorkspacePage() {
  // 仮のデータ（後でデータベースから取得）
  const [stats] = useState({
    channelCount: 3,
    messageCount: 42,
    memberCount: 8
  });

  const channels = [
    { id: '1', name: '一般', description: '一般的な話題について話しましょう' },
    { id: '2', name: '開発', description: 'プロジェクトの開発に関する議論' },
    { id: '3', name: '雑談', description: '自由な雑談スペース' }
  ];

  const directMessages = [
    { id: 'dm1', partnerName: '田中さん' },
    { id: 'dm2', partnerName: '佐藤さん' }
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Users className="mr-2 h-4 w-4" />
            新規 DM
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新規チャンネル
          </Button>
        </div>
      </div>

      {/* 統計情報カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">チャンネル・DM</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.channelCount + directMessages.length}</div>
            <p className="text-xs text-muted-foreground">参加しているチャンネル・DM 数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">メッセージ</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messageCount}</div>
            <p className="text-xs text-muted-foreground">自分が投稿したメッセージ数</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">メンバー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.memberCount}</div>
            <p className="text-xs text-muted-foreground">ワークスペース全体のメンバー数</p>
          </CardContent>
        </Card>
      </div>

      {/* チャンネル・DM一覧 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* チャンネル一覧 */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>チャンネル一覧</CardTitle>
            <CardDescription>参加しているチャンネル一覧</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channels.map((channel) => (
                <div key={channel.id} className="flex items-center">
                  <div className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Hash className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Link 
                      href={`/workspace/channel/${channel.id}`} 
                      className="font-medium hover:underline block"
                    >
                      {channel.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{channel.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* DM一覧 */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>DM 一覧</CardTitle>
            <CardDescription>ダイレクトメッセージ一覧</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {directMessages.map((dm) => (
                <div key={dm.id} className="flex items-center">
                  <div className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <span className="font-medium text-primary">
                      {dm.partnerName.charAt(0)}
                    </span>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Link 
                      href={`/workspace/channel/${dm.id}`} 
                      className="font-medium hover:underline block"
                    >
                      {dm.partnerName}
                    </Link>
                    <p className="text-sm text-muted-foreground">ダイレクトメッセージ</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}