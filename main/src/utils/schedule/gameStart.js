import { prisma } from '../prisma/index.js';
/**
 * @description
 *기존의 모든 주문과 주식을 삭제합니다.
 */
async function resetOrderAndStock() {
  try {
    await prisma.stock.deleteMany();
    await prisma.order.deleteMany();
  } catch (error) {
    console.error('주문 및 주식을 삭제하는 동안 오류가 발생했습니다:', error);
  }
}
/**
 * @description
 * 모든 사용자의 잔액을 1000만 원으로 재설정합니다.
 
 */
async function resetUserMoney() {
  try {
    // 데이터베이스에서 모든 사용자를 가져옴
    const users = await prisma.user.findMany();

    // 각 사용자의 잔액에 1000만 원을 추가하기 위해 각 사용자에 대해 반복
    for (const user of users) {
      await prisma.user.update({
        where: {
          userId: +user.userId, // 각 사용자의 id로 업데이트 대상을 지정
        },
        data: {
          currentMoney: BigInt(10000000),
          initialSeed: BigInt(10000000),
          totalAsset: BigInt(10000000),
        },
      });
    }
  } catch (error) {
    console.error('사용자 잔액을 업데이트하는 동안 오류가 발생했습니다:', error);
  }
}
