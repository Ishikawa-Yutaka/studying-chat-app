/**
 * サイドバー表示テスト用データ作成スクリプト
 *
 * 目的: 石川裕ユーザーが参加していないチャンネルと、
 *       DMをやり取りしていないユーザーを作成する
 *
 * 作成内容:
 * 1. 新規ユーザー「テストユーザーA」を作成
 * 2. 新規ユーザー「テストユーザーB」を作成
 * 3. テストユーザーAのみが参加する「非公開チャンネル」を作成
 * 4. テストユーザーAとテストユーザーB間のDMを作成
 *
 * 確認方法:
 * - 石川裕でログイン後、サイドバーに「非公開チャンネル」が表示されないことを確認
 * - 石川裕でログイン後、サイドバーに「テストユーザーA」「テストユーザーB」が表示されないことを確認
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 サイドバー表示テスト用データ作成開始...\n');

  try {
    // 1. 石川裕ユーザーを確認
    const ishikawaUser = await prisma.user.findFirst({
      where: {
        email: 'yutaka.ishikawa.uni@gmail.com'
      }
    });

    if (!ishikawaUser) {
      console.error('❌ 石川裕ユーザーが見つかりません');
      return;
    }

    console.log(`✅ 石川裕ユーザー確認: ${ishikawaUser.name} (${ishikawaUser.email})\n`);

    // 2. テストユーザーA作成（またはすでに存在する場合は取得）
    let testUserA = await prisma.user.findFirst({
      where: { email: 'test-user-a@example.com' }
    });

    if (!testUserA) {
      testUserA = await prisma.user.create({
        data: {
          authId: `test-user-a-${Date.now()}`, // ダミーのauthId
          name: 'テストユーザーA',
          email: 'test-user-a@example.com'
        }
      });
      console.log('✅ テストユーザーA作成:', testUserA.name);
    } else {
      console.log('✅ テストユーザーA既存:', testUserA.name);
    }

    // 3. テストユーザーB作成（またはすでに存在する場合は取得）
    let testUserB = await prisma.user.findFirst({
      where: { email: 'test-user-b@example.com' }
    });

    if (!testUserB) {
      testUserB = await prisma.user.create({
        data: {
          authId: `test-user-b-${Date.now()}`, // ダミーのauthId
          name: 'テストユーザーB',
          email: 'test-user-b@example.com'
        }
      });
      console.log('✅ テストユーザーB作成:', testUserB.name);
    } else {
      console.log('✅ テストユーザーB既存:', testUserB.name);
    }

    console.log('');

    // 4. テストユーザーAのみが参加する「非公開チャンネル」を作成
    const privateChannelName = '非公開チャンネル';
    let privateChannel = await prisma.channel.findFirst({
      where: {
        name: privateChannelName,
        type: 'channel'
      }
    });

    if (!privateChannel) {
      privateChannel = await prisma.channel.create({
        data: {
          name: privateChannelName,
          description: '石川裕は参加していないチャンネル（サイドバーに表示されないはず）',
          type: 'channel',
          members: {
            create: {
              userId: testUserA.id // テストユーザーAのみ参加
            }
          }
        },
        include: {
          members: true
        }
      });
      console.log(`✅ チャンネル作成: ${privateChannel.name}`);
      console.log(`   参加メンバー: テストユーザーAのみ`);
    } else {
      console.log(`✅ チャンネル既存: ${privateChannel.name}`);
    }

    console.log('');

    // 5. テストユーザーAとテストユーザーB間のDMチャンネルを作成
    const existingDm = await prisma.channel.findFirst({
      where: {
        type: 'dm',
        members: {
          every: {
            OR: [
              { userId: testUserA.id },
              { userId: testUserB.id }
            ]
          }
        }
      },
      include: {
        members: true
      }
    });

    if (!existingDm) {
      const dmChannel = await prisma.channel.create({
        data: {
          type: 'dm',
          members: {
            create: [
              { userId: testUserA.id },
              { userId: testUserB.id }
            ]
          }
        },
        include: {
          members: {
            include: {
              user: true
            }
          }
        }
      });
      console.log(`✅ DM作成: テストユーザーA ↔ テストユーザーB`);
      console.log(`   石川裕は参加していないため、サイドバーに表示されないはず`);
    } else {
      console.log(`✅ DM既存: テストユーザーA ↔ テストユーザーB`);
    }

    console.log('\n📊 テストデータ作成完了\n');

    // 6. 最終確認: 石川裕が参加しているチャンネル・DM一覧を表示
    console.log('=== 石川裕が参加しているチャンネル・DM ===');
    const ishikawaChannels = await prisma.channelMember.findMany({
      where: {
        userId: ishikawaUser.id
      },
      include: {
        channel: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    console.log('\n【チャンネル】');
    ishikawaChannels
      .filter(cm => cm.channel.type === 'channel')
      .forEach(cm => {
        console.log(`  - ${cm.channel.name}`);
      });

    console.log('\n【DM】');
    ishikawaChannels
      .filter(cm => cm.channel.type === 'dm')
      .forEach(cm => {
        const partner = cm.channel.members.find(m => m.userId !== ishikawaUser.id);
        if (partner) {
          console.log(`  - ${partner.user.name} (${partner.user.email})`);
        }
      });

    console.log('\n=== サイドバーに表示されないはずのデータ ===');
    console.log('【チャンネル】');
    console.log(`  - ${privateChannelName} ← 石川裕は参加していない`);
    console.log('\n【ユーザー（DM未開始）】');
    console.log(`  - テストユーザーA ← 石川裕とDMしていない`);
    console.log(`  - テストユーザーB ← 石川裕とDMしていない`);

    console.log('\n✅ テストデータ作成完了');
    console.log('\n次のステップ:');
    console.log('1. ブラウザで http://localhost:3001/workspace を開く');
    console.log('2. 石川裕でログイン');
    console.log('3. サイドバーに「非公開チャンネル」が表示されないことを確認');
    console.log('4. サイドバーに「テストユーザーA」「テストユーザーB」が表示されないことを確認');
    console.log('5. 「チャンネルを探す」をクリックすると「非公開チャンネル」が表示されることを確認');
    console.log('6. 「新規 DM」をクリックすると「テストユーザーA」「テストユーザーB」が表示されることを確認\n');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('❌ スクリプト実行エラー:', error);
    process.exit(1);
  });
