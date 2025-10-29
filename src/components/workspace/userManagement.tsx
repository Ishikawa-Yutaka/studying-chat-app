/**
 * ユーザー管理コンポーネント
 * - ワークスペース内のユーザー一覧表示
 * - 新規DM作成
 * - チャンネル招待機能
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { usePresenceContext } from '@/contexts/PresenceContext';
import { UserAvatar } from '@/components/userAvatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 型定義
interface User {
  id: string;
  name: string;
  email: string;
  authId: string;
  avatarUrl?: string | null;  // プロフィール画像
  lastSeen?: Date;            // 最終ログイン時刻
}

interface Channel {
  id: string;
  name: string;
  description?: string;
}

interface UserManagementProps {
  onUserUpdate?: () => void; // サイドバーのデータ更新用
}

export default function UserManagement({ onUserUpdate }: UserManagementProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // PresenceContextからオンライン状態取得
  const { isUserOnline } = usePresenceContext();

  // 状態管理
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>('');

  // ダイアログ状態
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // ユーザー一覧取得
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.success) {
          // 自分以外のユーザーを表示
          const otherUsers = data.users.filter((u: User) => u.authId !== currentUser.id);
          console.log('👥 ユーザー一覧取得成功:', otherUsers);
          setUsers(otherUsers);
        } else {
          console.error('❌ ユーザー一覧取得失敗:', data.error);
        }
      } catch (error) {
        console.error('❌ ユーザー一覧取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // チャンネル一覧取得（招待用）
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchChannels = async () => {
      try {
        const response = await fetch(`/api/channels?userId=${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
          setChannels(data.channels);
        }
      } catch (error) {
        console.error('❌ チャンネル一覧取得エラー:', error);
      }
    };

    fetchChannels();
  }, [currentUser]);

  // 検索フィルター
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // フィルター済みユーザーにオンライン状態を追加（Presenceで動的に判定）
  const usersWithOnlineStatus = filteredUsers.map(user => ({
    ...user,
    isOnline: isUserOnline(user.authId)
  }));

  // 新規DM作成
  const handleCreateDM = async (targetUser: User) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      // DM作成API呼び出し
      const response = await fetch(`/api/dm/${targetUser.authId}?myUserId=${currentUser.id}`, {
        method: 'GET'
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ DM作成成功:', data.dmChannel.id);
        
        // サイドバー更新
        onUserUpdate?.();
        
        // DMページに遷移
        router.push(`/workspace/dm/${targetUser.authId}`);
      } else {
        alert('DMの作成に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('❌ DM作成エラー:', error);
      alert('DMの作成に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // チャンネル招待
  const handleInviteToChannel = async () => {
    if (!selectedUser || !selectedChannel || !currentUser) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/channel-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: selectedChannel,
          userAuthId: selectedUser.authId,
          inviterId: currentUser.id
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`${selectedUser.name}をチャンネルに招待しました！`);
        setIsInviteDialogOpen(false);
        setSelectedUser(null);
        setSelectedChannel('');
        
        // サイドバー更新
        onUserUpdate?.();
      } else {
        alert('招待に失敗しました: ' + data.error);
      }
    } catch (error) {
      console.error('❌ チャンネル招待エラー:', error);
      alert('招待に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4" />
        <span className="font-semibold text-sm">ユーザー管理</span>
      </div>

      {/* 検索バー */}
      <div className="relative mb-3">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ユーザーを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* ユーザー一覧 */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="text-center text-xs text-muted-foreground py-4">
            読み込み中...
          </div>
        ) : usersWithOnlineStatus.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-4">
            {searchTerm ? '該当するユーザーが見つかりません' : 'ユーザーがいません'}
          </div>
        ) : (
          usersWithOnlineStatus.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border mb-1"
            >
              {/* ユーザー情報エリア */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <UserAvatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  size="sm"
                  className="h-8 w-8"
                  showOnlineStatus={true}
                  isOnline={user.isOnline}
                />

                {/* 名前・メール・オンライン状態テキスト */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    {user.email}
                    {/* オンライン状態テキスト */}
                    {user.isOnline && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-green-600 dark:text-green-400 font-medium">アクティブ</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-1">
                {/* DM作成ボタン */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateDM(user)}
                  disabled={isLoading}
                  className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>

                {/* チャンネル招待ボタン */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(user);
                    setIsInviteDialogOpen(true);
                  }}
                  disabled={isLoading}
                  className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white border-green-500"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* チャンネル招待ダイアログ */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>チャンネルに招待</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}をチャンネルに招待します
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">招待先チャンネル</label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="チャンネルを選択..." />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleInviteToChannel}
                disabled={!selectedChannel || isLoading}
              >
                招待する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}