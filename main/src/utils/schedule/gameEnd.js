import { prisma } from '../prisma/index.js';
/**
 * @description
 * 사용자의 총 자산을 업데이트 합니다.
 * @returns {Promise<Array>} 수정된 사용자 객체 배열
 */
async function updateAllUsertotalAsset() {
  let users = await prisma.user.findMany();
  const companies = await prisma.company.findMany();
  let companyInfo = {};
  for (const company of companies) {
    companyInfo[company.companyId] = company.currentPrice;
  }
  for (let user of users) {
    let totalAsset = BigInt(user.currentMoney); // user.currentMoney가 BigInt 호환 값이라고 가정합니다.
    const stocks = await prisma.stock.findMany({
      where: {
        userId: user.userId,
      },
    });

    for (const stock of stocks) {
      totalAsset += BigInt(companyInfo[stock.companyId]) * BigInt(stock.quantity);
    }
    user.totalAsset = totalAsset; // BigInt를 문자열로 변환합니다.
    await prisma.user.update({
      where: {
        userId: user.userId,
      },
      data: {
        totalAsset: user.totalAsset,
      },
    });
  }
  return users; // 수정된 사용자 객체 배열을 반환합니다.
}
/**
 * @description
 * 사용자의 업데이트된 총자산을 이용하여 랭킹보드를 업데이트합니다.
 */
async function updateRankBoard() {
  try {
    const users = await prisma.user.findMany();
    await prisma.rank.deleteMany();
    users.sort((a, b) => {
      const aProfitRate = (BigInt(a.totalAsset) - BigInt(a.initialSeed)) / BigInt(a.initialSeed);
      const bProfitRate = (BigInt(b.totalAsset) - BigInt(b.initialSeed)) / BigInt(b.initialSeed);
      return Number(bProfitRate - aProfitRate); // BigInt 비교 후, 숫자로 변환
    });
    for (let i = 0; i < Math.min(users.length, 5); i++) {
      let diff = BigInt(users[i].totalAsset) - BigInt(users[i].initialSeed);
      let rate = (Number(diff) / Number(users[i].initialSeed)) * 100;
      rate = Math.round(rate * 100) / 100;
      await prisma.rank.create({
        data: {
          userId: users[i].userId,
          ranking: i + 1,
          earningRate: rate,
          nickname: users[i].nickname,
        },
      });
    }
  } catch (err) {
    console.error('랭킹보드 업데이트 중 오류가 발생했습니다:', err);
  }
}
async function updateMMR() {
  try {
    const rankUsers = await prisma.rank.findMany();
    for (let i = 0; i < Math.min(rankUsers.length, 3); i++) {
      const user = await prisma.user.findUnique({
        where: {
          userId: rankUsers[i].userId,
        },
      });
      if (i == 0) {
        user.mmr += 100;
      } else if (i == 1) {
        user.mmr += 50;
      } else if (i == 2) {
        user.mmr += 30;
      }
      if (user.mmr >= 400) {
        user.tier = 'diamond';
      } else if (user.mmr >= 300) {
        user.tier = 'platinum';
      } else if (user.mmr >= 200) {
        user.tier = 'gold';
      } else if (user.mmr >= 100) {
        user.tier = 'silver';
      }
      await prisma.user.update({
        where: {
          userId: user.userId,
        },
        data: {
          mmr: user.mmr,
          tier: user.tier,
        },
      });
    }
  } catch (err) {
    console.error('MMR 업데이트 중 오류가 발생했습니다:', err);
  }
}
