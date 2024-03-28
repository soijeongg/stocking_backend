import { cur } from '../companyInfo/index.js';
import { prisma } from '../prisma/index.js';
const cursave = cur;

async function updateAllUsertotalAsset() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    let totalAsset = BigInt(user.currentMoney); // user.currentMoney가 BigInt 호환 값이라고 가정합니다.
    const stocks = await prisma.stock.findMany({
      where: {
        userId: user.userId,
      },
    });
    for (const stock of stocks) {
      const company = await prisma.company.findFirst({
        where: {
          companyId: stock.companyId,
        },
      });
      if (company && company.name in cursave) {
        totalAsset += BigInt(cursave[company.name]) * BigInt(stock.quantity);
      }
    }
    // await prisma.user.update({
    //   where: {
    //     userId: user.userId,
    //   },
    //   data: {
    //     totalAsset: totalAsset.toString(), // 데이터베이스가 BigInt를 지원한다고 가정하고 문자열로 변환합니다.
    //   },
    // });
  }
  return users; // 수정된 사용자 객체 배열을 반환합니다.
}

async function updateRankBoard() {
  try {
    const users = await updateAllUsertotalAsset();
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
export { updateRankBoard }; // 수정된 export 방식
