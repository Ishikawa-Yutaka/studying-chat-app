/**
 * DM開始ダイアログコンポーネント
 *
 * 用途: ダッシュボードから新しいDMを開始するためのモーダル
 *
 * 機能:
 * - ユーザー一覧表示（自分以外）
 * - ユーザー検索
 * - DMチャンネル作成（既存があれば再利用）
 * - DM作成後、自動的にDMページに遷移
 *
 * 参考: UserManagementコンポーネントの機能を再利用
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/userAvatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// 型定義
interface User {
  id: string;
  name: string;
  email: string;
  authId: string;
  avatarUrl?: string | null;
}

interface StartDmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDmCreated?: () => void; // サイドバー更新用
}

export default function StartDmDialog({
  open,
  onOpenChange,
  onDmCreated
}: StartDmDialogProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // 状態管理
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * ユーザー一覧取得
   *
   * 処理の流れ:
   * 1. GET /api/users でワークスペース内の全ユーザーを取得
   * 2. 自分以外のユーザーをフィルタリング
   * 3. ユーザー一覧を表示
   */
  useEffect(() => {
    // モーダルが開かれていない、または認証されていない場合はスキップ
    if (!open || !currentUser) return;

    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('👥 ユーザー一覧取得開始...');

        const response = await fetch('/api/users');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'ユーザー一覧の取得に失敗しました');
        }

        if (data.success) {
          // 自分以外のユーザーを表示
          const otherUsers = data.users.filter((u: User) => u.authId !== currentUser.id);
          console.log(`✅ ユーザー一覧取得成功: ${otherUsers.length}人`);
          setUsers(otherUsers);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        console.error('❌ ユーザー一覧取得エラー:', err);
        setError(err instanceof Error ? err.message : 'ユーザー一覧の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [open, currentUser]);

  /**
   * 検索フィルター
   *
   * ユーザー名またはメールアドレスで検索
   * 大文字小文字を区別しない
   */
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * 新規DM作成処理
   *
   * 処理の流れ:
   * 1. API呼び出し（GET /api/dm/[partnerId]）
   * 2. 既存のDMチャンネルがあればそれを返す、なければ新規作成
   * 3. 成功したらDMページに遷移
   * 4. サイドバーを更新
   *
   * 重要: DMは重複作成されない（API側で制御）
   */
  const handleCreateDM = async (targetUser: User) => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 DM作成開始:', targetUser.name);

      // DM作成API呼び出し（既存のDMがあればそれを返す）
      const response = await fetch(`/api/dm/${targetUser.authId}?myUserId=${currentUser.id}`, {
        method: 'GET'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'DMの作成に失敗しました');
      }

      if (data.success) {
        console.log('✅ DM作成成功:', data.dmChannel.id);

        // モーダルを閉じる
        onOpenChange(false);

        // サイドバー更新（新しいDMを一覧に反映）
        if (onDmCreated) {
          onDmCreated();
        }

        // DMページに遷移
        router.push(`/workspace/dm/${targetUser.authId}`);

        // 検索フィールドをリセット
        setSearchTerm('');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('❌ DM作成エラー:', err);
      setError(err instanceof Error ? err.message : 'DMの作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ユーザー検索</DialogTitle>
          <DialogDescription>
            メッセージを送信するユーザーを選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ユーザー名またはメールアドレスで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* ユーザー一覧 */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                読み込み中...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {searchTerm ? '該当するユーザーが見つかりません' : 'ユーザーがいません'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  {/* ユーザー情報 */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* アバター画像 */}
                    <UserAvatar
                      name={user.name}
                      avatarUrl={user.avatarUrl}
                      size="md"
                      className="shrink-0"
                    />

                    {/* 名前・メール */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  {/* DMボタン */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCreateDM(user)}
                    disabled={isLoading}
                    className="shrink-0"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    DM
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
