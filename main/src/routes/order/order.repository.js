export class OrderRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  // 주문 조회 section---------------------------------------------------------------------------------------------------------------------------------

  //displayType- 기본 정렬:0, 시간별 정렬(오래된 순): 1,시간별 정렬(최신순):2, 회사별 정렬(a부터): 3, 회사별 정렬(z부터): 4,
  //             매수/ 매도(매수 먼저):5, 매수/ 매도(매도 먼저):6, 체결여부(true먼저):7, 체결여부(false먼저):8

  // 0: 유저번호로 주문 조회 & 기본정렬
  findOrderByUserId = async (userId) => {
    return await this.prisma.order.findMany({
      where: {
        userId,
      },
      include: {
        Company: true,
      },
    });
  };

  // 1: 주문목록을 시간순으로 정렬 (오래된 순)
  sortOrderByTimeOldOrder = async (defaultOrder) => {
    return defaultOrder.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
  };

  // 2: 주문목록을 시간순으로 정렬 (최신순)
  sortOrderByTimeLatest = async (defaultOrder) => {
    return defaultOrder.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  };

  //  3: 회사별 정렬(a부터)
  sortOrderByCompanyNameAsc = async (defaultOrder) => {
    return defaultOrder.sort((a, b) => a.Company.name.localeCompare(b.Company.name));
  };

  // 4: 회사별 정렬(z부터)
  sortOrderByCompanyNameDesc = async (defaultOrder) => {
    return defaultOrder.sort((a, b) => b.Company.name.localeCompare(a.Company.name));
  };

  // 5: 매수/ 매도(매수 먼저)
  sortOrderByTypeBuyFirst = async (defaultOrder) => {
    return defaultOrder.sort((a, b) => (a.type === 'buy' ? -1 : b.type === 'buy' ? 1 : 0));
  };

  // 6: 매수/ 매도(매도 먼저)
  sortOrderByTypeSellFirst = async (defaultOrder) => {
    return defaultOrder.sort((a, b) => (a.type === 'sell' ? -1 : b.type === 'sell' ? 1 : 0));
  };

  // 7: 체결여부(true 먼저)
  sortOrderByIsSoldTrueFirst = async (defaultOrder) => {
    return defaultOrder.sort((a, b) => (a.isSold === b.isSold ? 0 : a.isSold ? -1 : 1));
  };

  // 8: 체결여부(false 먼저)
  sortOrderByIsSoldFalseFirst = async (defaultOrder) => {
    return defaultOrder.sort((a, b) => (a.isSold === b.isSold ? 0 : a.isSold ? 1 : -1));
  };

  // 주문 생성 section---------------------------------------------------------------------------------------------------------------------------------

  //주문번호로 주문 조회
  findTargetData = async (orderId) => {
    return await this.prisma.order.findUnique({
      where: {
        orderId,
      },
    });
  };

  // 사용자의 user.currentMoney 조회
  findAvailableCash = async (userId) => {
    return await this.prisma.user.findFirst({
      where: {
        userId,
      },
      select: {
        currentMoney: true,
      },
    });
  };

  // 사용자의 stock.quantity 조회
  findStockQuantity = async (userId, companyId) => {
    return await this.prisma.stock.findFirst({
      where: {
        userId,
        companyId,
      },
      select: {
        quantity: true,
      },
    });
  };

  // stock테이블에 orderData.companyId의 데이터
  isStockExisting = async (userId, orderData) => {
    const stockData = await this.prisma.stock.findFirst({
      where: {
        userId,
        companyId: orderData.companyId,
      },
    });
    const isStock = stockData != null;
    return { stockData, isStock };
  };

  //즉시 체결된 매수 주문 처리 - 트랜잭션처리
  concludeBuyoutOrder = async (userId, orderData, orderedValue, isStock, changedAveragePrice, stockId) => {
    // 1. user 테이블의 currentMoney 정보 변동
    // 2. stock 테이블에서 orderData.companyId의 데이터가 존재하면 update, 없으면 create해야함

    let changeAsset = [
      this.prisma.user.update({
        where: {
          userId,
        },
        data: {
          currentMoney: {
            decrement: orderedValue,
          },
        },
      }),
    ];

    if (isStock) {
      // stock테이블에 orderData.companyId의 데이터가 존재할때
      changeAsset.push(
        this.prisma.stock.update({
          where: {
            userId,
            companyId: orderData.companyId,
            stockId: stockId,
          },
          data: {
            averagePrice: changedAveragePrice,
            quantity: {
              increment: orderData.quantity,
            },
          },
        })
      );
    } else {
      // stock테이블에 orderData.companyId의 데이터가 존재하지 않을때
      changeAsset.push(
        this.prisma.stock.create({
          data: {
            userId: userId,
            companyId: orderData.companyId,
            averagePrice: orderData.price,
            quantity: orderData.quantity,
          },
        })
      );
    }
    try {
      return await this.prisma.$transaction(changeAsset);
    } catch (error) {
      return { error: true, message: 'repository단계에서 실패했어요!', detail: error.message };
    }
  };

  // 즉시 체결된 매도 주문 처리 - 트랜잭션 처리
  concludeSaleOrder = async (userId, orderData, orderedValue, stockId) => {
    // user테이블의 currentMoney 정보 변동
    // stock테이블의 quantity 정보 변동
    // 매도의 경우 무조건 줄이면 된다.

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          userId,
        },
        data: {
          currentMoney: {
            increment: orderedValue,
          },
        },
      }),
      this.prisma.stock.update({
        where: {
          userId,
          companyId: orderData.companyId,
          stockId: stockId,
        },
        data: {
          quantity: {
            decrement: orderData.quantity,
          },
        },
      }),
    ]);
  };

  //주문 생성 요청
  postOrderByUserId = async (userId, orderData) => {
    return await this.prisma.order.create({
      data: {
        ...orderData,
        userId,
      },
    });
  };

  //주문 정정 요청---------------------------------------------------------------------------------------------------------------------------------
  updateOrderByOrderId = async (userId, orderId, orderData) => {
    console.log('rep.update에 접근했습니다.');
    return await this.prisma.order.update({
      where: {
        userId,
        orderId,
      },
      data: orderData,
    });
  };
  //주문 삭제 요청---------------------------------------------------------------------------------------------------------------------------------
  deleteOrderByOrderId = async (userId, orderId) => {
    return await this.prisma.order.delete({
      where: {
        userId,
        orderId,
      },
    });
  };
}
