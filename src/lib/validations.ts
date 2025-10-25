/**
 * バリデーションスキーマ定義
 * Zodを使用した入力検証ルール
 */

import { z } from 'zod';

/**
 * メッセージバリデーション
 * - 最大5000文字
 * - 空白のみは不可
 */
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'メッセージを入力してください')
    .max(5000, 'メッセージは5000文字以内で入力してください')
    .refine((val) => val.trim().length > 0, {
      message: '空白のみのメッセージは送信できません'
    }),
  senderId: z.string().min(1, '送信者IDが必要です'),
  channelId: z.string().min(1, 'チャンネルIDが必要です'),
  // ファイル添付情報（オプション）
  fileUrl: z.string().regex(/^https?:\/\/.+/, 'URL形式が無効です').optional(),
  fileName: z.string().max(255).optional(),
  fileType: z.string().optional(),
  fileSize: z.number().max(10 * 1024 * 1024, 'ファイルサイズは10MB以下にしてください').optional(),
});

/**
 * ファイルのみのメッセージバリデーション
 * - contentは空でもOK（ファイルがあれば）
 */
export const messageWithFileSchema = z.object({
  content: z.string().max(5000, 'メッセージは5000文字以内で入力してください'),
  senderId: z.string().min(1, '送信者IDが必要です'),
  channelId: z.string().min(1, 'チャンネルIDが必要です'),
  fileUrl: z.string().regex(/^https?:\/\/.+/, 'URL形式が無効です'),
  fileName: z.string().max(255),
  fileType: z.string(),
  fileSize: z.number().max(10 * 1024 * 1024, 'ファイルサイズは10MB以下にしてください'),
});

/**
 * チャンネル名バリデーション
 * - 1〜50文字
 * - 空白のみは不可
 */
export const channelNameSchema = z
  .string()
  .min(1, 'チャンネル名を入力してください')
  .max(50, 'チャンネル名は50文字以内で入力してください')
  .refine((val) => val.trim().length > 0, {
    message: '空白のみのチャンネル名は使用できません'
  });

/**
 * チャンネル説明バリデーション
 * - 最大500文字
 */
export const channelDescriptionSchema = z
  .string()
  .max(500, 'チャンネルの説明は500文字以内で入力してください')
  .optional();

/**
 * チャンネル作成バリデーション
 */
export const createChannelSchema = z.object({
  name: channelNameSchema,
  description: channelDescriptionSchema,
});

/**
 * ファイルタイプバリデーション
 * 許可されたファイルタイプのみ受け入れ
 */
export const allowedFileTypes = [
  // 画像
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  // PDF
  'application/pdf',
  // Microsoft Office
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/msword', // .doc
  'application/vnd.ms-excel', // .xls
  'application/vnd.ms-powerpoint', // .ppt
  // テキスト
  'text/plain',
  'text/csv',
];

/**
 * ファイルバリデーション
 */
export const fileSchema = z.object({
  type: z.string().refine(
    (val) => allowedFileTypes.includes(val),
    {
      message: '許可されていないファイル形式です。画像、PDF、Office文書のみアップロード可能です。'
    }
  ),
  size: z.number().max(10 * 1024 * 1024, 'ファイルサイズは10MB以下にしてください'),
  name: z.string().max(255, 'ファイル名は255文字以内にしてください'),
});

/**
 * AIチャットメッセージバリデーション
 */
export const aiChatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'メッセージを入力してください')
    .max(5000, 'メッセージは5000文字以内で入力してください')
    .refine((val) => val.trim().length > 0, {
      message: '空白のみのメッセージは送信できません'
    }),
  sessionId: z.string().optional(),
});

/**
 * ユーザー名バリデーション
 * - 1〜50文字
 * - 空白のみは不可
 */
export const userNameSchema = z
  .string()
  .min(1, 'ユーザー名を入力してください')
  .max(50, 'ユーザー名は50文字以内で入力してください')
  .refine((val) => val.trim().length > 0, {
    message: '空白のみのユーザー名は使用できません'
  });

/**
 * メールアドレスバリデーション
 * - メール形式チェック
 * - 最大255文字（データベース制限）
 */
export const emailSchema = z
  .string()
  .min(1, 'メールアドレスを入力してください')
  .max(255, 'メールアドレスは255文字以内で入力してください')
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    '正しいメールアドレス形式で入力してください'
  );

/**
 * パスワードバリデーション
 * - 最小8文字、最大128文字
 * - セキュリティのため、あまりに長いパスワードは拒否
 */
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .max(128, 'パスワードは128文字以内で入力してください');

/**
 * サインアップバリデーション
 */
export const signupSchema = z.object({
  name: userNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/**
 * ログインバリデーション
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
