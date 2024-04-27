import redisClient from '../../utils/redisClient/index.js';

export class OrderRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  // 주문 가능 여부 확인
  checkOrderIsPossible = async () => {
    const result = await redisClient.get('isOrderPossible');
    return result === 'true';
  };

  // 주문 번호 + 유저 번호로 주문 조회
  findOrderByOrderId = async (userId, orderId, transaction) => {
    const prismaContext = transaction || this.prisma;
    return await prismaContext.order.findFirst({
      where: {
        userId,
        orderId,
      },
    });
  };

  // 형식님이 만들어주신 주문조회by 쿼리문
  filterData = async (userId, name, type, order, isSold) => {
    const prismaContext = this.prisma;
    // 주문을 가져올 변수
    let stocks;
    // console.log('Repo 도착!');
    // console.log(userId, name, type, order, isSold);
    if (order === '오름차순') {
      //1차필터링
      stocks = await prismaContext.order.findMany({
        where: {
          userId,
        },
        include: {
          Company: true,
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });
    } else if (order === '내림차순') {
      stocks = await prismaContext.order.findMany({
        where: {
          userId,
        },
        include: {
          Company: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    } else {
      stocks = await prismaContext.order.findMany({
        where: {
          userId,
        },
        include: {
          Company: true,
        },
      });
    }

    // console.log('필터링 전 stock', stocks);
    // 2차 필터링
    const filteredStocks = stocks.filter((item) => {
      const companyName = item.Company.name;

      // 회사이름검색
      if (name && !companyName.includes(name)) {
        return false;
      }
      // 타입검색
      if (type && item.type !== type) {
        return false;
      }

      return true;
    });

    // console.log('필터링 후 stocks', filteredStocks);
    return filteredStocks;
  };

  //주문 삭제 요청---------------------------------------------------------------------------------------------------------------------------------
  deleteOrderByOrderId = async (userId, orderId) => {
    const prismaContext = this.prisma;
    return await prismaContext.order.delete({
      where: {
        userId,
        orderId,
      },
    });
  };
}
