import { prisma } from '../prisma/index.js';

// 정의된 규칙에 따라 실행될 작업 정의
async function depositEveryday() {
  try {
    // 데이터베이스에서 모든 사용자를 가져옴
    const users = await prisma.user.findMany();

    // 각 사용자의 잔액에 1000만 원을 추가함
    await Promise.all(
      users.map(async (user) => {
        await prisma.user.update({
          where: { userId: +user.userId },
          data: {
            // BigInt 연산으로 1000만 원 추가
            currentMoney: BigInt(user.currentMoney) + BigInt(10000000),
            initialSeed: BigInt(user.initialSeed) + BigInt(10000000),
          },
        });
      })
    );

    console.log('모든 사용자의 잔액에 1000만 원을 추가했습니다.');
  } catch (error) {
    console.error('사용자 잔액을 업데이트하는 동안 오류가 발생했습니다:', error);
  }
}

export { depositEveryday };
