export class OrderRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  // 주문 조회 section---------------------------------------------------------------------------------------------------------------------------------

  // 유저 번호로 주문 조회
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

  // 주문 번호 + 유저 번호로 주문 조회
  findOrderByOrderId = async (userId, orderId) => {
    return await this.prisma.order.findFirst({
      where: {
        userId,
        orderId,
      },
    });
  };

  // 형식님이 만들어주신 주문조회by 쿼리문
  filterData = async (userId, name, type, order, isSold) => {
    // 주문을 가져올 변수
    let stocks;
    console.log('Repo 도착!');
    console.log(userId, name, type, order, isSold);
    if (order === '오름차순') {
      //1차필터링
      stocks = await this.prisma.order.findMany({
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
      stocks = await this.prisma.order.findMany({
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
      stocks = await this.prisma.order.findMany({
        where: {
          userId,
        },
        include: {
          Company: true,
        },
      });
    }

    console.log('필터링 전 stock', stocks);
    // 2차 필터링
    const filteredStocks = stocks.filter((item) => {
      const companyName = item.Company.name;

      // 회사이름검색
      if (name && companyName !== name) {
        return false;
      }
      // 타입검색
      if (type && item.type !== type) {
        return false;
      }
      // isSold 검색 (수정된 버전)
      if (isSold !== undefined) {
        const isSoldBoolean = isSold === 'true'; // 'true' 문자열을 boolean 값으로 변환
        if (item.isSold !== isSoldBoolean) {
          return false;
        }
      }

      return true;
    });
    console.log('필터링 후 stocks', filteredStocks);
    return filteredStocks;
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
    console.log('감소 시작!!'),
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
            stockId: +stockId,
          },
          data: {
            quantity: {
              decrement: orderData.quantity,
            },
          },
        }),
      ]);
  };
  // 즉시 체결된 매도 주문 처리 - 트랜잭션 처리 - quantity가 0이됨
  concludeSaleOrderIfQuantityZero = async (userId, orderData, orderedValue, stockId) => {
    // user테이블의 currentMoney 정보 변동
    // stock테이블의 quantity 정보 변동
    // 매도의 경우 무조건 줄이면 된다.
    console.log('감소 시작!!'),
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
        this.prisma.stock.delete({
          where: {
            userId,
            companyId: orderData.companyId,
            stockId: +stockId,
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