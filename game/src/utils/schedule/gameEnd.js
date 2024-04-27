import { prisma } from '../prisma/index.js';
import { sendToMatchingServer } from '../sendToMatchingServer/index.js';
import { sendNoticesToAllClients } from '../socketConnecter/socketConnecter.js';

/**
 * @description User 테이블에서 `dummy` 속성이 `true`로 설정된 모든 사용자를 대상으로 삭제 작업을 수행
 * @returns {Promise<void>} 더미 사용자 삭제 작업을 완료한 후 Promise를 반환
 * @throws {Error} 데이터베이스 작업 중 오류가 발생할 경우, 오류 메시지를 콘솔에 출력
 */
async function deleteDummyUser() {
  // 더미 사용자를 삭제
  try {
    await prisma.user.deleteMany({
      where: {
        dummy: true,
      },
    });
  } catch (err) {
    console.error('더미 사용자 삭제 중 오류가 발생했습니다:', err);
  }
}
/**
 * @description 데이터베이스에서 모든 회사 정보를 삭제
 * @returns {Promise<void>} 회사 정보 삭제 작업을 완료한 후 Promise를 반환
 * @throws {Error} 데이터베이스 작업 중 오류가 발생할 경우, 오류 메시지를 콘솔에 출력
 */
async function deleteCompany() {
  try {
    await prisma.company.deleteMany();
  } catch (err) {
    console.error('회사 정보를 삭제하는 동안 오류가 발생했습니다:', err);
  }
}
/**
 * @description 데이터베이스에서 모든 사용자의 주식을 현금화
 * 그 결과를 사용자의 현재 금액(`currentMoney`)과 총 자산(`totalAsset`)에 반영
 * @returns {Promise<void>} 모든 사용자의 주식을 현금화하고 자산 정보를 업데이트한 후 Promise를 반환
 * @throws {Error} 데이터베이스 작업 중 오류가 발생할 경우, 오류 메시지를 콘솔에 출력
 */
async function updateStockToCash() {
  try {
    await prisma.$transaction(async (tx) => {
      // 사용자 정보를 가져옴
      let users = await tx.user.findMany();
      // 회사 정보를 가져옴
      const companies = await tx.company.findMany();
      let companyInfo = {};
      // 회사의 현재 가격을 객체에 저장
      for (const company of companies) {
        companyInfo[company.companyId] = company.currentPrice;
      }
      // 유저별로 주식을 현금으로 변환
      for (let user of users) {
        let totalAsset = BigInt(user.currentMoney);
        const stocks = await tx.stock.findMany({
          where: {
            userId: user.userId,
          },
        });
        await tx.stock.deleteMany({
          where: {
            userId: user.userId,
          },
        });

        for (const stock of stocks) {
          totalAsset += BigInt(companyInfo[stock.companyId]) * BigInt(stock.quantity);
        }
        totalAsset = totalAsset.toString();
        // urrentMoney와 totalAsset 업데이트
        await tx.user.update({
          where: {
            userId: user.userId,
          },
          data: {
            currentMoney: totalAsset,
            totalAsset: totalAsset,
          },
        });
      }
    });
  } catch (err) {
    console.error('주식을 현금으로 변환하는 동안 오류가 발생했습니다:', err);
  }
}
/**
 * @description 사용자의 수익률을 기반으로 랭킹 보드를 업데이트
 * 모든 사용자를 수익률에 따라 정렬한 후, 상위 5명의 사용자 정보만을 랭킹 보드에 저장
 * 수익률은 사용자의 초기 자본 대비 총 자산의 증가율로 계산
 * @returns {Promise<void>} 랭킹 보드 업데이트 작업을 완료한 후 Promise를 반환
 * @throws {Error} 데이터베이스 작업 중 발생하는 오류를 콘솔에 출력
 */
async function updateRankBoard() {
  try {
    // Order 테이블에서 모든 userId를
    const orderUsers = await prisma.order.findMany({
      select: {
        userId: true,
      },
    });
    // Concluded 테이블에서 모든 userId를 가져오기
    const concludedUsers = await prisma.concluded.findMany({
      select: {
        userId: true,
      },
    });
    // 합집합을 구하기 위해 Set을 사용
    const combinedUserIds = new Set([...orderUsers.map((u) => u.userId), ...concludedUsers.map((u) => u.userId)]);
    // 게임에 참여한 userId를 기반으로 User 테이블에서 사용자 정보를 가져옴
    const users = await prisma.user.findMany({
      where: {
        userId: {
          in: Array.from(combinedUserIds),
        },
      },
    });
    // 기존 랭킹 보드 삭제
    await prisma.rank.deleteMany();
    // 수익률을 기반으로 사용자를 정렬
    users.sort((a, b) => {
      const aProfitRate = Number(BigInt(a.totalAsset) - BigInt(a.initialSeed)) / Number(BigInt(a.initialSeed));
      const bProfitRate = Number(BigInt(b.totalAsset) - BigInt(b.initialSeed)) / Number(BigInt(b.initialSeed));
      return Number(bProfitRate - aProfitRate); // BigInt 비교 후, 숫자로 변환
    });
    sendNoticesToAllClients('랭킹이 업데이트 되었습니다!'); //랭킹 업데이트 알림
    // 상위 5명의 사용자 정보를 랭킹 보드에 저장
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
      sendNoticesToAllClients(`${i + 1}등 : ${users[i].nickname}님 수익률 : ${rate}%`); //랭킹 알림
    }
  } catch (err) {
    console.error('랭킹보드 업데이트 중 오류가 발생했습니다:', err);
  }
}
/**
 * @description 상위 3명의 사용자의 MMR을 업데이트하고, 그에 따라 티어를 조정
 * @returns {Promise<void>} MMR 업데이트 작업을 완료한 후 Promise를 반환
 * @throws {Error} 데이터베이스 작업 중 오류가 발생할 경우, 오류 메시지를 콘솔에 출력
 */
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
/**
 * @description 매칭 서버에 게임 종료 요청을 전송
 * @returns {Promise<void>} 서버로의 요청 전송이 완료된 후 Promise를 반환.
 */
async function sendMatchingServerGameEnd() {
  const jsonData = {
    reqType: 'gameDelete',
  };
  const jsonDataString = JSON.stringify(jsonData);
  await sendToMatchingServer(jsonDataString);
}
export { deleteDummyUser, deleteCompany, updateStockToCash, updateRankBoard, updateMMR, sendMatchingServerGameEnd };
