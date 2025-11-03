/**
 * バリデーションスキーマのユニットテスト
 *
 * テスト対象: src/lib/validations.ts
 *
 * このテストでは、Zodバリデーションスキーマが
 * 正しく機能するかを確認します。
 *
 * テストする機能:
 * - メッセージバリデーション
 * - チャンネルバリデーション
 * - ファイルバリデーション
 * - ユーザー認証バリデーション
 */

import {
  messageSchema,
  messageWithFileSchema,
  channelNameSchema,
  channelDescriptionSchema,
  createChannelSchema,
  fileSchema,
  allowedFileTypes,
  aiChatMessageSchema,
  userNameSchema,
  emailSchema,
  passwordSchema,
  signupSchema,
  loginSchema,
} from '@/lib/validations'

describe('validations - バリデーションスキーマ', () => {
  /**
   * messageSchema - メッセージバリデーション
   */
  describe('messageSchema - メッセージバリデーション', () => {
    const validMessageData = {
      content: 'テストメッセージ',
      senderId: 'user-123',
      channelId: 'channel-456',
    }

    test('有効なメッセージデータは検証を通過する', () => {
      expect(() => messageSchema.parse(validMessageData)).not.toThrow()
    })

    test('空のコンテンツはエラーになる', () => {
      const invalidData = { ...validMessageData, content: '' }
      expect(() => messageSchema.parse(invalidData)).toThrow(
        'メッセージを入力してください'
      )
    })

    test('空白のみのコンテンツはエラーになる', () => {
      const invalidData = { ...validMessageData, content: '   ' }
      expect(() => messageSchema.parse(invalidData)).toThrow(
        '空白のみのメッセージは送信できません'
      )
    })

    test('5000文字以上のメッセージはエラーになる', () => {
      const longMessage = 'a'.repeat(5001)
      const invalidData = { ...validMessageData, content: longMessage }
      expect(() => messageSchema.parse(invalidData)).toThrow(
        'メッセージは5000文字以内で入力してください'
      )
    })

    test('5000文字ちょうどのメッセージは許可される', () => {
      const maxMessage = 'a'.repeat(5000)
      const validData = { ...validMessageData, content: maxMessage }
      expect(() => messageSchema.parse(validData)).not.toThrow()
    })

    test('senderIdが空の場合はエラーになる', () => {
      const invalidData = { ...validMessageData, senderId: '' }
      expect(() => messageSchema.parse(invalidData)).toThrow(
        '送信者IDが必要です'
      )
    })

    test('channelIdが空の場合はエラーになる', () => {
      const invalidData = { ...validMessageData, channelId: '' }
      expect(() => messageSchema.parse(invalidData)).toThrow(
        'チャンネルIDが必要です'
      )
    })

    test('オプションのファイル情報が含まれても検証を通過する', () => {
      const dataWithFile = {
        ...validMessageData,
        fileUrl: 'https://example.com/file.png',
        fileName: 'test.png',
        fileType: 'image/png',
        fileSize: 1024,
      }
      expect(() => messageSchema.parse(dataWithFile)).not.toThrow()
    })

    test('無効なfileUrl形式はエラーになる', () => {
      const invalidData = {
        ...validMessageData,
        fileUrl: 'invalid-url',
      }
      expect(() => messageSchema.parse(invalidData)).toThrow('URL形式が無効です')
    })

    test('10MBを超えるファイルサイズはエラーになる', () => {
      const invalidData = {
        ...validMessageData,
        fileUrl: 'https://example.com/large.pdf',
        fileSize: 11 * 1024 * 1024, // 11MB
      }
      expect(() => messageSchema.parse(invalidData)).toThrow(
        'ファイルサイズは10MB以下にしてください'
      )
    })
  })

  /**
   * channelNameSchema - チャンネル名バリデーション
   */
  describe('channelNameSchema - チャンネル名バリデーション', () => {
    test('有効なチャンネル名は検証を通過する', () => {
      expect(() => channelNameSchema.parse('一般')).not.toThrow()
    })

    test('空のチャンネル名はエラーになる', () => {
      expect(() => channelNameSchema.parse('')).toThrow(
        'チャンネル名を入力してください'
      )
    })

    test('空白のみのチャンネル名はエラーになる', () => {
      expect(() => channelNameSchema.parse('   ')).toThrow(
        '空白のみのチャンネル名は使用できません'
      )
    })

    test('50文字以上のチャンネル名はエラーになる', () => {
      const longName = 'a'.repeat(51)
      expect(() => channelNameSchema.parse(longName)).toThrow(
        'チャンネル名は50文字以内で入力してください'
      )
    })

    test('50文字ちょうどのチャンネル名は許可される', () => {
      const maxName = 'a'.repeat(50)
      expect(() => channelNameSchema.parse(maxName)).not.toThrow()
    })
  })

  /**
   * channelDescriptionSchema - チャンネル説明バリデーション
   */
  describe('channelDescriptionSchema - チャンネル説明バリデーション', () => {
    test('有効な説明は検証を通過する', () => {
      expect(() =>
        channelDescriptionSchema.parse('テストチャンネルの説明')
      ).not.toThrow()
    })

    test('undefinedは許可される（オプション）', () => {
      expect(() => channelDescriptionSchema.parse(undefined)).not.toThrow()
    })

    test('空文字は許可される', () => {
      expect(() => channelDescriptionSchema.parse('')).not.toThrow()
    })

    test('500文字以上の説明はエラーになる', () => {
      const longDescription = 'a'.repeat(501)
      expect(() => channelDescriptionSchema.parse(longDescription)).toThrow(
        'チャンネルの説明は500文字以内で入力してください'
      )
    })

    test('500文字ちょうどの説明は許可される', () => {
      const maxDescription = 'a'.repeat(500)
      expect(() => channelDescriptionSchema.parse(maxDescription)).not.toThrow()
    })
  })

  /**
   * createChannelSchema - チャンネル作成バリデーション
   */
  describe('createChannelSchema - チャンネル作成バリデーション', () => {
    test('有効なチャンネルデータは検証を通過する', () => {
      const validData = {
        name: '一般',
        description: 'テストチャンネル',
      }
      expect(() => createChannelSchema.parse(validData)).not.toThrow()
    })

    test('descriptionなしでも許可される', () => {
      const validData = {
        name: '一般',
      }
      expect(() => createChannelSchema.parse(validData)).not.toThrow()
    })

    test('無効な名前はエラーになる', () => {
      const invalidData = {
        name: '',
        description: 'テスト',
      }
      expect(() => createChannelSchema.parse(invalidData)).toThrow()
    })
  })

  /**
   * fileSchema - ファイルバリデーション
   */
  describe('fileSchema - ファイルバリデーション', () => {
    test('有効な画像ファイルは検証を通過する', () => {
      const validFile = {
        type: 'image/png',
        size: 1024 * 1024, // 1MB
        name: 'test.png',
      }
      expect(() => fileSchema.parse(validFile)).not.toThrow()
    })

    test('有効なPDFファイルは検証を通過する', () => {
      const validFile = {
        type: 'application/pdf',
        size: 2 * 1024 * 1024, // 2MB
        name: 'document.pdf',
      }
      expect(() => fileSchema.parse(validFile)).not.toThrow()
    })

    test('許可されていないファイルタイプはエラーになる', () => {
      const invalidFile = {
        type: 'application/x-executable', // 実行ファイル
        size: 1024,
        name: 'malware.exe',
      }
      expect(() => fileSchema.parse(invalidFile)).toThrow(
        '許可されていないファイル形式です'
      )
    })

    test('10MBを超えるファイルサイズはエラーになる', () => {
      const invalidFile = {
        type: 'image/png',
        size: 11 * 1024 * 1024, // 11MB
        name: 'large.png',
      }
      expect(() => fileSchema.parse(invalidFile)).toThrow(
        'ファイルサイズは10MB以下にしてください'
      )
    })

    test('255文字を超えるファイル名はエラーになる', () => {
      const invalidFile = {
        type: 'image/png',
        size: 1024,
        name: 'a'.repeat(256) + '.png',
      }
      expect(() => fileSchema.parse(invalidFile)).toThrow(
        'ファイル名は255文字以内にしてください'
      )
    })

    test('allowedFileTypesに全ての許可タイプが含まれている', () => {
      expect(allowedFileTypes).toContain('image/jpeg')
      expect(allowedFileTypes).toContain('image/png')
      expect(allowedFileTypes).toContain('application/pdf')
      expect(allowedFileTypes).toContain('text/plain')
      expect(allowedFileTypes.length).toBeGreaterThan(0)
    })
  })

  /**
   * userNameSchema - ユーザー名バリデーション
   */
  describe('userNameSchema - ユーザー名バリデーション', () => {
    test('有効なユーザー名は検証を通過する', () => {
      expect(() => userNameSchema.parse('田中太郎')).not.toThrow()
    })

    test('空のユーザー名はエラーになる', () => {
      expect(() => userNameSchema.parse('')).toThrow(
        'ユーザー名を入力してください'
      )
    })

    test('空白のみのユーザー名はエラーになる', () => {
      expect(() => userNameSchema.parse('   ')).toThrow(
        '空白のみのユーザー名は使用できません'
      )
    })

    test('50文字以上のユーザー名はエラーになる', () => {
      const longName = 'a'.repeat(51)
      expect(() => userNameSchema.parse(longName)).toThrow(
        'ユーザー名は50文字以内で入力してください'
      )
    })
  })

  /**
   * emailSchema - メールアドレスバリデーション
   */
  describe('emailSchema - メールアドレスバリデーション', () => {
    test('有効なメールアドレスは検証を通過する', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow()
    })

    test('空のメールアドレスはエラーになる', () => {
      expect(() => emailSchema.parse('')).toThrow(
        'メールアドレスを入力してください'
      )
    })

    test('無効なメール形式はエラーになる', () => {
      expect(() => emailSchema.parse('invalid-email')).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
    })

    test('@がないメールアドレスはエラーになる', () => {
      expect(() => emailSchema.parse('testexample.com')).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
    })

    test('ドメインがないメールアドレスはエラーになる', () => {
      expect(() => emailSchema.parse('test@')).toThrow(
        '正しいメールアドレス形式で入力してください'
      )
    })

    test('255文字を超えるメールアドレスはエラーになる', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(() => emailSchema.parse(longEmail)).toThrow(
        'メールアドレスは255文字以内で入力してください'
      )
    })
  })

  /**
   * passwordSchema - パスワードバリデーション
   */
  describe('passwordSchema - パスワードバリデーション', () => {
    test('有効なパスワードは検証を通過する', () => {
      expect(() => passwordSchema.parse('password123')).not.toThrow()
    })

    test('8文字未満のパスワードはエラーになる', () => {
      expect(() => passwordSchema.parse('pass123')).toThrow(
        'パスワードは8文字以上で入力してください'
      )
    })

    test('8文字ちょうどのパスワードは許可される', () => {
      expect(() => passwordSchema.parse('12345678')).not.toThrow()
    })

    test('128文字を超えるパスワードはエラーになる', () => {
      const longPassword = 'a'.repeat(129)
      expect(() => passwordSchema.parse(longPassword)).toThrow(
        'パスワードは128文字以内で入力してください'
      )
    })

    test('128文字ちょうどのパスワードは許可される', () => {
      const maxPassword = 'a'.repeat(128)
      expect(() => passwordSchema.parse(maxPassword)).not.toThrow()
    })
  })

  /**
   * signupSchema - サインアップバリデーション
   */
  describe('signupSchema - サインアップバリデーション', () => {
    const validSignupData = {
      name: '田中太郎',
      email: 'tanaka@example.com',
      password: 'password123',
    }

    test('有効なサインアップデータは検証を通過する', () => {
      expect(() => signupSchema.parse(validSignupData)).not.toThrow()
    })

    test('無効な名前はエラーになる', () => {
      const invalidData = { ...validSignupData, name: '' }
      expect(() => signupSchema.parse(invalidData)).toThrow()
    })

    test('無効なメールアドレスはエラーになる', () => {
      const invalidData = { ...validSignupData, email: 'invalid-email' }
      expect(() => signupSchema.parse(invalidData)).toThrow()
    })

    test('無効なパスワードはエラーになる', () => {
      const invalidData = { ...validSignupData, password: '123' }
      expect(() => signupSchema.parse(invalidData)).toThrow()
    })
  })

  /**
   * loginSchema - ログインバリデーション
   */
  describe('loginSchema - ログインバリデーション', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123',
    }

    test('有効なログインデータは検証を通過する', () => {
      expect(() => loginSchema.parse(validLoginData)).not.toThrow()
    })

    test('無効なメールアドレスはエラーになる', () => {
      const invalidData = { ...validLoginData, email: 'invalid' }
      expect(() => loginSchema.parse(invalidData)).toThrow()
    })

    test('無効なパスワードはエラーになる', () => {
      const invalidData = { ...validLoginData, password: 'short' }
      expect(() => loginSchema.parse(invalidData)).toThrow()
    })
  })

  /**
   * aiChatMessageSchema - AIチャットメッセージバリデーション
   */
  describe('aiChatMessageSchema - AIチャットメッセージバリデーション', () => {
    test('有効なAIメッセージは検証を通過する', () => {
      const validData = {
        message: 'AIに質問します',
        sessionId: 'session-123',
      }
      expect(() => aiChatMessageSchema.parse(validData)).not.toThrow()
    })

    test('sessionIdなしでも許可される', () => {
      const validData = {
        message: 'AIに質問します',
      }
      expect(() => aiChatMessageSchema.parse(validData)).not.toThrow()
    })

    test('空のメッセージはエラーになる', () => {
      const invalidData = {
        message: '',
      }
      expect(() => aiChatMessageSchema.parse(invalidData)).toThrow(
        'メッセージを入力してください'
      )
    })

    test('空白のみのメッセージはエラーになる', () => {
      const invalidData = {
        message: '   ',
      }
      expect(() => aiChatMessageSchema.parse(invalidData)).toThrow(
        '空白のみのメッセージは送信できません'
      )
    })
  })
})
