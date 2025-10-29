/**
 * Prisma共通Selectorファイル
 *
 * 各APIで繰り返し使われるPrisma selectオブジェクトを共通化
 *
 * メリット:
 * - コードの重複削減
 * - 一貫性の向上（全APIで同じフィールドを返す）
 * - メンテナンス性向上（1箇所変更すれば全体に反映）
 *
 * 使い方:
 * ```typescript
 * import { userBasicSelect, userWithStatusSelect } from '@/lib/prisma-selectors';
 *
 * const users = await prisma.user.findMany({
 *   select: userWithStatusSelect
 * });
 * ```
 */

import { Prisma } from '@prisma/client';

/**
 * ユーザー基本情報（オンライン状態なし）
 *
 * 使用場面: チャンネル作成など、オンライン状態が不要な場合
 */
export const userBasicSelect = {
  id: true,
  name: true,
  email: true,
  authId: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

/**
 * ユーザー情報（最終オンライン時刻含む）
 *
 * 使用場面: ユーザー一覧、DM一覧など
 *
 * 含まれるフィールド:
 * - id: 内部ID
 * - name: ユーザー名
 * - email: メールアドレス
 * - authId: Supabase AuthID
 * - avatarUrl: プロフィール画像URL
 * - lastSeen: 最終オンライン時刻（オフライン時に更新）
 *
 * 注: オンライン状態はPresenceで管理（データベースには保存しない）
 */
export const userWithStatusSelect = {
  id: true,
  name: true,
  email: true,
  authId: true,
  avatarUrl: true,
  lastSeen: true,
} satisfies Prisma.UserSelect;

/**
 * メッセージ送信者情報
 *
 * 使用場面: メッセージ一覧、スレッド返信など
 *
 * Note: オンライン状態はPresenceで管理（データベースには保存しない）
 */
export const messageSenderSelect = {
  id: true,
  name: true,
  email: true,
  authId: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

/**
 * チャンネルメンバーのユーザー情報
 *
 * 使用場面: チャンネルメンバー一覧、DM相手情報など
 *
 * Note: オンライン状態はPresenceで管理（データベースには保存しない）
 */
export const channelMemberUserSelect = {
  id: true,
  name: true,
  email: true,
  authId: true,
  avatarUrl: true,
  lastSeen: true,
} satisfies Prisma.UserSelect;

/**
 * チャンネル基本情報
 *
 * 使用場面: チャンネル一覧など
 */
export const channelBasicSelect = {
  id: true,
  name: true,
  description: true,
  type: true,
  creatorId: true,
} satisfies Prisma.ChannelSelect;

/**
 * チャンネル情報（メンバー含む）
 *
 * 使用場面: チャンネル詳細、ダッシュボードなど
 */
export const channelWithMembersInclude = {
  members: {
    include: {
      user: {
        select: channelMemberUserSelect,
      },
    },
  },
} satisfies Prisma.ChannelInclude;

/**
 * メッセージ情報（送信者・返信含む）
 *
 * 使用場面: メッセージ一覧取得
 */
export const messageWithDetailsInclude = {
  sender: {
    select: messageSenderSelect,
  },
  replies: {
    include: {
      sender: {
        select: messageSenderSelect,
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} satisfies Prisma.MessageInclude;
