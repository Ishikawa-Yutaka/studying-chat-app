# 要件定義書 - リアルタイムチャットアプリケーション

**オンラインスクール修了課題プロジェクト**

---

## 1. プロジェクト概要

### 1.1 基本情報

| 項目 | 内容 |
|------|------|
| **プロジェクト名** | studying-tech-chat-app |
| **目的** | オンラインスクール修了課題 |
| **対象ユーザー** | プログラミング学習者、技術コミュニティメンバー |
| **リポジトリ** | https://github.com/Ishikawa-Yutaka/studying-chat-app |

### 1.2 プロジェクト説明

技術学習者向けのリアルタイムチャットプラットフォーム。Slack/Discordのような機能を持ち、チャット内でAI（GPT-4o-mini）に質問できる統合環境を提供します。

**主な特徴**:
- リアルタイムチャット（チャンネル・DM）
- ファイル共有（画像・ドキュメント・動画）
- スレッド機能（Slack風）
- AIアシスタント統合（GPT-4o-mini）
- オンライン状態表示
- ダークモード対応

**学習目標**:
- Next.js 15（App Router）の実践的活用
- Supabase（認証・Realtime・Storage）の統合
- Prisma ORMによるデータベース設計
- OpenAI APIの活用
- レスポンシブUIの実装
- パフォーマンス最適化技術の習得

---

## 2. 解決する課題と価値提案

### 2.1 学習者が抱える問題

| 課題 | 本アプリの解決策 |
|------|-----------------|
| **学習中の孤独感** | リアルタイムチャット + AIアシスタント |
| **情報の分散** | チャット + AI を1つのアプリで統合 |
| **非同期の限界** | WebSocketによる即時メッセージ配信 |
| **履歴の喪失** | スレッド機能 + AI会話履歴保存 |

### 2.2 競合との差別化

| 競合サービス | 本アプリの優位性 |
|------------|----------------|
| **Slack** | AI学習支援の統合（チャット内でGPT-4o-miniに質問可能） |
| **Discord** | 学習履歴の整理・検索（AIとの会話履歴を保存・管理） |
| **ChatGPT** | チャット + AI の融合（チーム会話とAI支援の両立） |
| **Teams** | シンプルで学習に特化（プログラミング学習者向けUX） |

---

## 3. ユーザーストーリー

### 3.1 認証・アカウント管理
- ユーザーとして、メールアドレスでアカウント登録したい（個人を特定できるようにするため）
- ユーザーとして、Google/GitHubでログインしたい（アカウント作成の手間を省くため）
- ユーザーとして、プロフィール画像を設定したい（視覚的に自分を識別しやすくするため）

### 3.2 チャンネル管理
- ユーザーとして、新しいチャンネルを作成したい（特定のトピックについて議論する場所が欲しいため）
- ユーザーとして、チャンネルを検索したい（興味のあるチャンネルをすぐに見つけるため）
- ユーザーとして、チャンネルに参加/退出したい（興味に応じてチャンネルを管理するため）

### 3.3 メッセージング
- ユーザーとして、テキストメッセージを送信したい（他のユーザーと会話するため）
- ユーザーとして、リアルタイムでメッセージを受信したい（即座に返信できるようにするため）
- ユーザーとして、スレッドで返信したい（特定のメッセージに対する会話を整理するため）
- ユーザーとして、ファイルを共有したい（画像やPDFを他のメンバーと共有するため）

### 3.4 AIチャットボット
- ユーザーとして、AIアシスタントに質問したい（学習中の疑問をすぐに解決するため）
- ユーザーとして、AI会話履歴を保存したい（後で見返すため）
- ユーザーとして、複数のAIセッションを管理したい（異なるトピックの会話を分けるため）

### 3.5 UI/UX
- ユーザーとして、モバイルデバイスでもアプリを使いたい（外出先でも会話に参加するため）
- ユーザーとして、オンラインステータスを確認したい（相手が今返信できるか知るため）
- ユーザーとして、ダークモードを使いたい（夜間の目の負担を減らすため）

---

## 4. 実装機能

### 4.1 完成済み機能

#### 認証・アカウント管理
- ✅ メール認証、ソーシャルログイン（Google/GitHub）
- ✅ セッション管理、アカウント削除
- ✅ プロフィール画像設定、ユーザー検索

#### チャット機能
- ✅ チャンネルチャット、ダイレクトメッセージ
- ✅ リアルタイム配信（Supabase Realtime）
- ✅ 楽観的更新、スレッド機能
- ✅ メッセージ履歴無制限閲覧

#### ファイル共有
- ✅ アップロード（画像・動画・ドキュメント、最大50MB）
- ✅ 対応形式: PNG, JPEG, GIF, WebP, MP4, QuickTime, AVI, PDF, Office形式など
- ✅ プレビュー・ダウンロード機能

#### チャンネル管理
- ✅ チャンネル作成・参加・退出・削除
- ✅ チャンネル検索

#### AI機能
- ✅ GPT-4o-miniとの会話
- ✅ セッション管理（ChatGPT/Claude風）
- ✅ 会話履歴保存、コンテキスト保持（過去20件）
- ✅ タイトル自動生成

#### オンライン状態
- ✅ リアルタイム表示（Supabase Presence）
- ✅ 最終オンライン時刻記録・表示

#### UI/UX
- ✅ レスポンシブデザイン（デスクトップ・モバイル・タブレット対応）
- ✅ ダークモード（next-themes）
- ✅ サイドバー、モバイルサイドバー
- ✅ 統計ダッシュボード、スムーズアニメーション

#### パフォーマンス最適化
- ✅ SWRキャッシュ（サイドバーのチャンネル・DM一覧）
- ✅ 楽観的更新（チャンネル操作・メッセージ送信）
- ✅ React.memo、useCallback、Next.js Image、dynamic import

### 4.2 未実装機能（優先順位順）

| 優先度 | 機能 |
|-------|------|
| **S** | メッセージ編集・削除、チャンネル編集、通知機能 |
| **C** | メッセージ検索、リアクション機能、コードシンタックスハイライト、ユーザー名変更、プライベートチャンネル |

---

## 5. 技術スタック

### 5.1 フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15.5.4 | Reactフレームワーク（App Router） |
| React | 19 | UIライブラリ |
| TypeScript | 最新 | 型安全性確保 |
| TailwindCSS | 4 | スタイリング |
| shadcn/ui | 最新 | UIコンポーネント |
| next-themes | 0.4.6 | ダークモード |
| SWR | 最新 | データフェッチ・キャッシュ |

### 5.2 バックエンド

| 技術 | 用途 |
|------|------|
| Next.js API Routes | RESTful API |
| Prisma ORM | データベースアクセス |
| PostgreSQL | データベース（Supabase経由） |
| OpenAI API | AIチャットボット（GPT-4o-mini） |

### 5.3 インフラ・サービス

| サービス | 用途 |
|---------|------|
| Supabase | 認証、Realtime、Presence、Storage、データベースホスティング |
| Vercel | デプロイ（予定） |
| GitHub | バージョン管理 |

### 5.4 開発ツール

| ツール | 用途 |
|--------|------|
| Playwright | E2Eテスト |
| Vitest | ユニットテスト |
| ESLint | コード品質チェック |
| Prettier | コードフォーマット |

---

## 6. ファイル構成

### 6.1 ページ構成

```
src/app/
├── login/                      # ログインページ
├── signup/                     # サインアップページ
├── workspace/                  # メインアプリケーション（認証必須）
│   ├── layout.tsx             # サイドバー付きレイアウト
│   ├── page.tsx               # ダッシュボード
│   ├── channel/[channelId]/   # チャンネルページ
│   ├── dm/[userId]/           # DMページ
│   └── ai-chat/               # AIチャットページ
├── auth/callback/             # OAuth認証コールバック
└── api/                       # APIルート
    ├── auth/                  # 認証API
    ├── channels/              # チャンネルAPI
    ├── messages/              # メッセージAPI
    ├── threads/               # スレッドAPI
    ├── dm/                    # DMAPI
    ├── ai/                    # AIAPI
    ├── user/                  # ユーザーAPI
    └── upload/                # ファイルアップロードAPI
```

### 6.2 コンポーネント構成

```
src/components/
├── ui/                        # 基本UIコンポーネント（shadcn/ui）
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── close-button.tsx
│
├── workspace/                 # サイドバー・レイアウト
│   ├── appLogo.tsx           # アプリロゴ
│   ├── channelList.tsx       # チャンネル一覧
│   ├── directMessageList.tsx # DM一覧
│   ├── userManagement.tsx    # ユーザー管理
│   ├── userProfileBar.tsx    # ユーザー情報・ログアウト
│   └── mobileSidebar.tsx     # モバイルサイドバー
│
├── channel/                   # チャット機能
│   ├── channelHeader.tsx     # チャンネルヘッダー
│   ├── messageView.tsx       # メッセージ一覧表示
│   ├── messageForm.tsx       # メッセージ入力・送信
│   ├── threadPanel.tsx       # スレッドパネル
│   └── filePreviewModal.tsx  # ファイルプレビュー
│
└── dm/                        # DM専用
    └── dmHeader.tsx          # DMヘッダー
```

### 6.3 主要ライブラリ・ユーティリティ

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # クライアント側Supabase
│   │   └── server.ts         # サーバー側Supabase
│   ├── prisma.ts             # Prismaクライアント
│   ├── dateUtils.ts          # 日付ユーティリティ
│   └── utils.ts              # 汎用ユーティリティ
│
├── hooks/
│   ├── useAuth.ts            # 認証フック
│   ├── useRealtimeMessages.ts # Realtimeメッセージフック
│   └── useOnlineStatus.ts    # オンライン状態フック
│
└── middleware.ts              # 認証ミドルウェア
```

---

## 7. データベース設計

### 7.1 主要テーブル

#### User（ユーザー）
- id, name, email, authId（Supabase Auth ID）, avatarUrl, lastSeen

#### Channel（チャンネル）
- id, name, description, type（"channel" または "dm"）, creatorId

#### ChannelMember（中間テーブル）
- id, userId, channelId
- ユニーク制約: [userId, channelId]

#### Message（メッセージ）
- id, content, senderId, channelId, parentMessageId（スレッド用）
- fileUrl, fileName, fileType, fileSize（ファイル添付用）

#### AiChatSession（AIセッション）
- id, userId, title（自動生成）

#### AiChat（AI会話履歴）
- id, userId, sessionId, message, response

### 7.2 削除時の動作

| リレーション | 削除動作 |
|------------|---------|
| User削除 | ChannelMember削除、AiChatSession削除、AiChat削除 |
| User削除 | Message.senderIdをnullに（メッセージは保持） |
| Channel削除 | ChannelMember削除、Message削除 |
| Message削除 | 子Message削除（スレッド返信も削除） |

---

## 8. API設計

### 8.1 主要エンドポイント

#### 認証
- POST `/api/auth/signup` - ユーザー登録
- POST `/api/auth/login` - ログイン
- POST `/api/auth/logout` - ログアウト
- GET `/auth/callback` - OAuth認証コールバック

#### チャンネル
- GET `/api/channels` - チャンネル一覧取得
- POST `/api/channels` - チャンネル作成
- DELETE `/api/channels/[channelId]` - チャンネル削除
- POST `/api/channels/join` - チャンネル参加
- DELETE `/api/channels/leave/[channelId]` - チャンネル退出
- GET `/api/channels/all` - 全チャンネル一覧

#### メッセージ
- GET `/api/messages/[channelId]` - メッセージ一覧取得
- POST `/api/messages/[channelId]` - メッセージ送信

#### スレッド
- GET `/api/threads/[messageId]` - スレッド返信一覧取得
- POST `/api/threads/[messageId]` - スレッド返信送信

#### DM
- GET `/api/dm/[partnerId]` - DM取得（なければ作成）
- DELETE `/api/dm/leave/[channelId]` - DM退出

#### ファイル共有
- POST `/api/upload` - ファイルアップロード
- 対応形式: PNG, JPEG, GIF, WebP, MP4, QuickTime, AVI, PDF, DOCX, XLSX, PPTX, ZIP, TXT
- 制限: 最大50MB

#### AI
- POST `/api/ai/chat` - AI質問（GPT-4o-mini）
- GET `/api/ai/sessions` - セッション一覧取得
- POST `/api/ai/sessions` - 新規セッション作成
- GET `/api/ai/sessions/[sessionId]` - セッション詳細取得
- DELETE `/api/ai/sessions/[sessionId]` - セッション削除

#### ユーザー
- GET `/api/users` - 全ユーザー一覧取得
- GET `/api/user/[userId]` - ユーザー情報取得
- DELETE `/api/user/delete` - アカウント削除
- POST `/api/avatar/upload` - アバター画像アップロード

---

## 9. 認証・認可

### 9.1 認証フロー

#### メール認証
1. ユーザーがメール・パスワード・名前を入力
2. Supabase Authにユーザー作成（authId発行）
3. Prisma DatabaseのUserテーブルに保存
4. 自動ログイン → /workspaceにリダイレクト

#### ソーシャルログイン（Google/GitHub）
1. Google/GitHubボタンをクリック
2. プロバイダーの認証画面にリダイレクト
3. 認証許可後、/auth/callbackにリダイレクト
4. Supabase Authからuser_metadata取得（アバターURL含む）
5. Prisma DBにupsert（既存ユーザーは更新、新規ユーザーは作成）
6. /workspaceにリダイレクト

### 9.2 認可（権限管理）

| リソース | 操作 | 権限ルール |
|---------|------|-----------|
| メッセージ | 送信・閲覧 | チャンネルメンバーのみ |
| チャンネル | 削除 | チャンネル作成者のみ |
| DM | 閲覧 | DM参加者2名のみ |
| ファイル | アップロード・ダウンロード | チャンネルメンバーのみ |
| AI | 質問・セッション管理 | 全ユーザー（自分のセッションのみ） |
| アカウント | 削除・アバター変更 | 自分のアカウントのみ |

---

## 10. リアルタイム機能

### 10.1 Supabase Realtime実装

| 機能 | トリガー |
|-----|---------|
| 新着メッセージ通知 | Message INSERT |
| スレッド返信通知 | Message INSERT（parentMessageId指定） |
| ダッシュボード統計更新 | Message/Channel INSERT/DELETE |
| オンライン状態表示 | Supabase Presence |

### 10.2 楽観的更新

送信者側で即座に画面更新し、UXを向上:
1. ユーザーが送信ボタンをクリック
2. 即座にローカル状態に追加（楽観的更新）
3. APIリクエスト送信
4. 成功時: 何もしない（既に表示済み）
5. 失敗時: エラー表示 + ローカル状態から削除

### 10.3 マルチタブ同期

同じユーザーが複数タブを開いても、全タブでリアルタイム同期されます。

---

## 11. パフォーマンス最適化

| 最適化手法 | 実装箇所 | 効果 |
|----------|---------|------|
| SWRキャッシュ | サイドバーのチャンネル・DM一覧 | サーバーリクエスト削減、高速ページ切り替え |
| 楽観的更新 | チャンネル操作・メッセージ送信 | 即座のUI更新 |
| React.memo | MessageViewコンポーネント | 不要な再レンダリング防止 |
| useCallback | Realtimeイベントハンドラー | 無限ループ防止 |
| Next.js Image | 画像表示 | 自動最適化、lazy loading、WebP変換 |
| dynamic import | モーダルコンポーネント | 初回バンドルサイズ削減 |

---

## 12. セキュリティ対策

| 対策 | 実装状況 |
|------|---------|
| HTTPS通信 | ✅ Supabase・Vercelは標準でHTTPS |
| パスワードハッシュ化 | ✅ Supabase Authが自動処理 |
| OAuth認証 | ✅ Google、GitHub対応 |
| セッション管理 | ✅ Supabase AuthのCookie-based Session |
| Middleware認証チェック | ✅ 全リクエストでセッション検証 |
| SQLインジェクション対策 | ✅ Prisma ORMのパラメータ化クエリ |
| XSS対策 | ✅ React標準のエスケープ処理 |
| CSRF対策 | ✅ Next.js標準のSameSite Cookie |
| ファイルアップロード検証 | ✅ MIME type・ファイルサイズ制限 |
| 権限チェック | ✅ 全APIで認証・権限チェック |

---

## 13. テスト実装

| テスト種別 | カバレッジ | 実装状況 |
|----------|----------|---------|
| ユニットテスト | 60% | ✅ 実装済み |
| 統合テスト | 一部 | 🔄 進行中 |
| E2Eテスト | 基本機能 | ✅ 実装済み（Playwright） |

**実装済みテスト**:
- コンポーネント・カスタムフックのユニットテスト
- 認証・ソーシャルログインのテスト
- ダークモード切り替えのテスト
- E2E: チャンネルページ、メッセージ送信・受信、リアルタイム通信

---

## 14. 今後の拡張計画

### 優先度1（Should Have）
1. メッセージ編集・削除機能
2. チャンネル編集機能
3. 通知機能（ブラウザ通知、プッシュ通知）

### 優先度2（Could Have）
4. メッセージ検索機能
5. リアクション機能
6. ユーザー名変更
7. コードシンタックスハイライト

---

## まとめ

この要件定義書は、オンラインスクール修了課題として実装した**リアルタイムチャットアプリケーション**の全体像を示しています。

### 主な達成事項

1. 完全なチャット機能（チャンネル・DM・リアルタイム配信・スレッド）
2. ファイル共有（画像・ドキュメント・動画、最大50MB）
3. AI統合（GPT-4o-miniによる学習支援、セッション管理）
4. オンライン状態（Supabase Presenceによるリアルタイム追跡）
5. ソーシャルログイン（Google、GitHub OAuth）
6. ダークモード（next-themes統合）
7. 検索機能（ユーザー・チャンネルのリアルタイムフィルタリング）
8. パフォーマンス最適化（SWR、楽観的更新、React.memo、useCallback）
9. E2Eテスト（Playwright）
10. セキュリティ（認証・認可・バリデーション完備）

### 技術的ハイライト

- TypeScript完全対応、Prisma ORM
- Supabase統合（認証・Realtime・Presence・Storage）
- OpenAI API（GPT-4o-mini）
- next-themes（ダークモード）
- SWR（データフェッチ・キャッシュ最適化）
- OAuth認証（Google、GitHub）
- テストカバレッジ60%
- レスポンシブUI（デスクトップ/モバイル/タブレット対応）

このプロジェクトを通じて、**モダンなWebアプリケーション開発の実践的なスキル**を習得しました。
