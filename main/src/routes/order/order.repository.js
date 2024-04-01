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

  // 형식님이 만들어주신 주문조회 by 쿼리문
  filterData = async (userId, name, type, order, isSold) => {
    // 주문을 가져올 변수
    let stocks;
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
      return true
    })

<<<<<<< HEAD
      return true;
    });
=======
    console.log('필터링 후 stocks', filteredStocks);
>>>>>>> bc571502e16fd91d73de4aa806b06d100df874e0
    return filteredStocks;
  };

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

  getMostCheapestSellings = async (selectedCompanyId, orderedQuantity) => {
    const sellOrders = await this.prisma.order.findMany({
      where: {
        type: 'sell',
        companyId: selectedCompanyId,
      },
      orderBy: {
        price: 'asc',
        createdAt: 'asc',
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
<<<<<<< HEAD

  // 주문 생성 section-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  //회사의 현재가 변경
  changeCurrentPrice = async (companyId, changedPrice) => {
    await this.prisma.Company.update({
      where: companyId,
      data: {
        price: changedPrice,
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

  decreaseUserStockInfo = async (userId, companyId, quantity) => {
    await this.prisma.Stock.update({
      where: {
        userId,
        companyId,
      },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });
  };
}

getUserStockInfo = async (userId, companyId) => {
  return await this.prisma.Stock.findFirst({
    where: {
      userId,
      companyId,
    },
    data: {
      averagePrice,
      quantity,
    },
  });
};

// 기존에 해당 회사의 주식이 있는 사람의 보유 주식 증가
increaseUserStockInfo_shareholder = async (userId, companyId, price, quantity) => {
  await this.prisma.Stock.update({
    where: {
      stockId: isStock.stockId,
    },
    data: {
      quantity: {
        increment: quantity,
      },
      averagePrice: price,
    },
  });
};

// 기존에 해당 회사의 주식이 없는 사람의 보유 주식 증가
increaseUserStockInfo_firstBuying = async (userId, companyId, price, quantity) => {
  await this.prisma.Stock.create({
    data: {
      userId,
      companyId,
      averagePrice: price,
      quantity,
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
=======
  }
>>>>>>> bc571502e16fd91d73de4aa806b06d100df874e0
