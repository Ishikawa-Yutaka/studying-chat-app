/**
 * アプリケーションで使用するデータ型の定義
 * 
 * データベースの構造と対応しており、TypeScriptの型安全性を確保します
 */

// チャンネルの種類を定義するEnum
export enum ChannelType {
  CHANNEL = 'channel', // 通常のチャンネル（複数人での会話）
  DM = 'dm',          // ダイレクトメッセージ（1対1の会話）
}

// ユーザーの型定義
export interface User {
  id: string;        // 一意のユーザーID
  name: string;      // ユーザー名
  email?: string;    // メールアドレス（オプション）
}

// チャンネルの型定義
export interface Channel {
  id: string;                    // 一意のチャンネルID
  name?: string;                 // チャンネル名（DMの場合はundefined）
  description?: string;          // チャンネルの説明（DMの場合はundefined）
  channelType: ChannelType;      // チャンネルの種類
  members: User[];               // チャンネルに参加しているユーザーの一覧
}

// メッセージの型定義
export interface Message {
  id: string;        // 一意のメッセージID
  channelId: string; // 所属するチャンネルのID
  sender: User;      // 送信者の情報
  content: string;   // メッセージ内容
  createdAt: Date;   // 送信日時
}

// AIチャットの役割を定義するEnum
export enum AiChatRole {
  USER = 'user',           // ユーザーのメッセージ
  ASSISTANT = 'assistant', // AIの応答
}

// AIチャットのメッセージ型定義
export interface AiChatMessage {
  role: AiChatRole; // メッセージの役割（ユーザーまたはAI）
  content: string;  // メッセージ内容
}

// AIチャットの履歴の型定義
export interface AiChatRecord {
  id: string;       // 一意のレコードID
  userId: string;   // 会話したユーザーのID
  message: string;  // ユーザーが送信したメッセージ
  response: string; // AIからの応答
  createdAt: Date;  // 会話日時
}