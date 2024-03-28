import { prisma } from '../prisma/index.js';

async function deleteOverTTL() {
  try {
    const time = new Date();
    await prisma.order.deleteMany({
      where: {
        timeToLive: {
          lt: time,
        },
      },
    });
    console.log('TTL을 지난 데이터를 삭제했습니다.');
  } catch (error) {
    console.error('TTL을 지난 데이터를 삭제하는 동안 오류가 발생했습니다:', error);
  }
}
deleteOverTTL();
export { deleteOverTTL };
