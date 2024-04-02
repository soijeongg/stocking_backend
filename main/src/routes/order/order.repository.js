export class OrderRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  transaction = async (operations) => {
    return await this.prisma.$transaction(operations);
  };
  // 주문 조회 section---------------------------------------------------------------------------------------------------------------------------------
  // 시장가 가져오기
  getCurrentPrice = async (findingCompanyId) => {
    return await this.prisma.Company.findFirst({
      where: {
        companyId: findingCompanyId,
      },
      select: {
        currentPrice: true,
      },
    });
  };
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

      return true;
    });

    console.log('필터링 후 stocks', filteredStocks);
    return filteredStocks;
  };

  // 트랜잭션을 사용하고 특정 quantity만큼만 가져와야하는 주문이기에 어쩔 수 없이 해당 repository에 여러 await을 넣었습니다.
  // 분리하게 되면 불필요한 대용량 데이터의 호출이 발생합니다.
  getMostExpensiveBuyings = async (selectedCompanyId, orderedQuantity) => {
    const buyOrders = await this.prisma.order.findMany({
      where: {
        type: 'buy',
        companyId: selectedCompanyId,
      },
      orderBy: {
        price: 'desc',
        createdAt: 'asc',
      },
    });

    let selectedQuantity = 0;
    const selectedOrders = []; // 선택된 각 주문들의 userId, orderId, price, quantity을 담을 배열

    await this.prisma.$transaction(async (prisma) => {
      for (const order of buyOrders) {
        if (selectedQuantity >= orderedQuantity) {
          break;
        }
        selectedQuantity += order.quantity;
        selectedOrders.push({
          userId: order.userId,
          orderId: order.orderId,
          type: order.type,
          price: order.price,
          quantity: order.quantity,
        });

        await this.prisma.order.delete({
          where: {
            orderId: order.orderId,
          },
        });
      }
    });

    return selectedOrders; //[{},{},{},...]형태
  };

  getUserCurrentMoney = async (findingUserId) => {
    return await this.prisma.User.findFirst({
      where: {
        userId: findingUserId,
      },
      select: {
        currentMoney: true,
      },
    });
  };

  getUserCurrentStockQuantity = async (targetUserId, targetCompanyId) => {
    return await this.prisma.Stock.findFirst({
      where: {
        userId: targetUserId,
        companyId: targetCompanyId,
      },
      select: {
        quantity: true,
      },
    });
  };

  getMostCheapestSellings = async (selectedCompanyId, orderedQuantity) => {
    const sellOrders = await this.prisma.order.findMany({
      where: {
        type: 'sell',
        companyId: selectedCompanyId,
      },
      orderBy: [{ price: 'asc' }, { updatedAt: 'asc' }],
    });

    let selectedQuantity = 0;
    const selectedOrders = []; // 선택된 각 주문들의 userId, orderId, price, quantity을 담을 배열

    await this.prisma.$transaction(async (prisma) => {
      for (const order of sellOrders) {
        if (selectedQuantity >= orderedQuantity) {
          break;
        }
        selectedQuantity += order.quantity;
        selectedOrders.push({
          userId: order.userId,
          orderId: order.orderId,
          type: order.type,
          price: order.price,
          quantity: order.quantity,
        });

        await this.prisma.order.delete({
          where: {
            orderId: order.orderId,
          },
        });
      }
    });

    return selectedOrders; //[{},{},{},...]형태
  };

  // companyId, price, type로 조회
  getSelectedOrder = async (companyId, price, type) => {
    return await this.prisma.findMany({
      where: {
        companyId,
        price,
        type,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  };

  // 주문 생성 section-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  //회사의 현재가 변경
  changeCurrentPrice = async (companyId, changedPrice) => {
    await this.prisma.Company.update({
      where: {
        companyId,
      },
      data: {
        currentPrice: changedPrice,
      },
    });
  };

  addUserIdToOrderData = async (userId, orderData) => {
    return {
      userId: userId,
      ...orderData,
    };
  };

  //______________________________________________________________ 시장가 주문 생성__________________________________________________________
  // 가장 비싼 매수 주문들의 orderId를 반환하고 해당 주문들을 삭제

  createConcludedOrder = async (userId, companyId, type, price, quantity) => {
    await this.prisma.Concluded.create({
      data: {
        userId: userId,
        companyId: companyId,
        type: type,
        price: price,
        quantity: quantity,
      },
    });
  };

  decreaseUserCurrentMoney = async (userId, totalPrice) => {
    await this.prisma.User.update({
      where: {
        userId,
      },
      data: {
        currentMoney: {
          decrement: totalPrice,
        },
      },
    });
  };

  increaseUserCurrentMoney = async (userId, totalPrice) => {
    await this.prisma.User.update({
      where: {
        userId,
      },
      data: {
        currentMoney: {
          increment: totalPrice,
        },
      },
    });
  };

  decreaseUserStockInfo = async (stockId, quantity) => {
    await this.prisma.Stock.update({
      where: {
        stockId,
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });
  };

  getUserStockInfo = async (userId, companyId) => {
    return await this.prisma.Stock.findFirst({
      where: {
        userId,
        companyId,
      },
      select: {
        stockId: true,
        averagePrice: true,
        quantity: true,
      },
    });
  };

  // 기존에 해당 회사의 주식이 있는 사람의 보유 주식 증가
  increaseUserStockInfo_shareholder = async (receivedStockId, receivedPrice, increasedQuantity) => {
    await this.prisma.Stock.update({
      where: {
        stockId: receivedStockId,
      },
      data: {
        quantity: {
          increment: increasedQuantity,
        },
        averagePrice: receivedPrice,
      },
    });
  };

  // 기존에 해당 회사의 주식이 없는 사람의 보유 주식 증가
  increaseUserStockInfo_firstBuying = async (receivedUserId, receivedCompanyId, receivedPrice, initialQuantity) => {
    await this.prisma.Stock.create({
      data: {
        userId: receivedUserId,
        companyId: receivedCompanyId,
        averagePrice: receivedPrice,
        quantity: initialQuantity,
      },
    });
  };

  // 가장 싼 매도주문들의 orderId를 반환하고 해당 주문들을 삭제
  getMostCheapestOrders = async (selectedCompanyId, orderedQuantity) => {
    const sellOrders = await this.prisma.order.findMany({
      where: {
        type: 'sell',
        companyId: selectedCompanyId,
      },
      orderBy: {
        price: 'desc',
      },
    });

    let selectedQuantity = 0;
    const selectedOrders = []; // 선택된 각 주문들의 userId, orderId, price, quantity을 담을 배열

    await this.prisma.$transaction(async (prisma) => {
      for (const order of sellOrders) {
        if (selectedQuantity >= orderedQuantity) {
          break;
        }
        selectedQuantity += order.quantity;
        selectedOrders.push({
          userId: order.userId,
          orderId: order.orderId,
          price: order.price,
          quantity: order.quantity,
        });

        await this.prisma.order.delete({
          where: {
            orderId: order.orderId,
          },
        });
      }
    });

    return selectedOrders; //[{},{},{},...]형태
  };

  //______________________________________________________________ 지정가 주문 생성__________________________________________________________
  createOrderByOrderData = async (orderData) => {
    return await this.prisma.order.create({
      data: orderData,
    });
  };

  changePriceOfData = async (data, changedPrice) => {
    return {
      ...data,
      price: changedPrice,
    };
  };

  //주문 정정 요청-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  changeOrderQuantity = async (userId, orderId, changedQuantity) => {
    return await this.prisma.order.update({
      where: {
        userId,
        orderId,
      },
      data: {
        quantity: changedQuantity,
      },
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