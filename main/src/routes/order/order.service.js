// 워낙 코드가 복잡해서 지속적인 테스트를 위해서 잡다한 console.log를 살려뒀습니다. //
// 어느정도 기간이 지나고 테스트가 끝나면 지우겠습니다. //
// 최대한 주석을 달아봤는데 추가로 달아주시면 매우 감사합니다. //

export class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
    this.orderConcludeBuyingProcess = this.orderConcludeBuyingProcess.bind(this);
    this.orderConcludeSellingProcess = this.orderConcludeSellingProcess.bind(this);
    this.concludeInitialBuyingOrder = this.concludeInitialBuyingOrder.bind(this);
    this.concludeInitialSellingOrder = this.concludeInitialSellingOrder.bind(this);
    this.verifyLastOrder = this.verifyLastOrder.bind(this);
  }

  // order테이블에서 불러온 주문들에서 마지막 주문을 lastOrder로 분리하고 나머지를 초기주문이라고 명명
  // 매수랑 매도가 로직이 좀 다름.
  // 지정가랑 시장가 로직이 좀 다름

  // ________________________________________________________체결 관련 로직 함수들____________________________________________________________________________________________________________________________________________

  // 매수 주문 체결
  async orderConcludeBuyingProcess(orderData, poppedArray, remainingQuantity, tx) {
    // ___________1. 매도자의 기록 처리___________
    // 체결 기록 생성- 매도자
    await this.orderRepository.createConcludedOrder(poppedArray.userId, orderData.companyId, poppedArray.type, poppedArray.price, remainingQuantity, tx);

    // 계좌 잔액 증가 - 매도자
    await this.orderRepository.increaseUserCurrentMoney(poppedArray.userId, poppedArray.price * remainingQuantity, tx);

    // 보유 주식 감소 - 매도자
    await this.orderRepository
      .getUserStockInfo(poppedArray.userId, poppedArray.companyId, tx)
      .then((stockIdObject) => this.orderRepository.decreaseUserStockInfo(stockIdObject.stockId, remainingQuantity, tx));
    // ___________2. 매수자(클라이언트)의 기록 처리___________
    // 체결 기록 생성 - 매수자
    await this.orderRepository.createConcludedOrder(orderData.userId, orderData.companyId, orderData.type, poppedArray.price, remainingQuantity, tx);

    // 계좌 잔액 감소 - 매수자
    await this.orderRepository.decreaseUserCurrentMoney(orderData.userId, poppedArray.price * remainingQuantity, tx);

    // 보유 주식 증가 - 매수자
    await this.orderRepository.getUserStockInfo(orderData.userId, orderData.companyId, tx).then((isStock) => {
      if (isStock) {
        const newAveragePrice = (isStock.averagePrice * isStock.quantity + poppedArray.price * remainingQuantity) / (isStock.quantity + remainingQuantity);
        return this.orderRepository.increaseUserStockInfo_shareholder(isStock.stockId, newAveragePrice, remainingQuantity, tx);
      } else {
        return this.orderRepository.increaseUserStockInfo_firstBuying(orderData.userId, orderData.companyId, poppedArray.price, remainingQuantity, tx);
      }
    });

    // 현재가 변경
    await this.orderRepository.changeCurrentPrice(orderData.companyId, poppedArray.price, tx);
    console.log('잘 마무리 되었습니다.');
  }

  // 매도 주문 체결
  async orderConcludeSellingProcess(orderData, poppedArray, remainingQuantity, tx) {
    // ___________1. 매도자(클라이언트)의 기록 처리___________
    const userStockIdObject = await this.orderRepository.getUserStockInfo(orderData.userId, orderData.companyId, tx);
    // 체결 기록 생성- 매도자
    await this.orderRepository.createConcludedOrder(orderData.userId, orderData.companyId, orderData.type, poppedArray.price, remainingQuantity, tx);
    // 계좌 변동 - 매도자
    await this.orderRepository.increaseUserCurrentMoney(orderData.userId, poppedArray.price * remainingQuantity, tx);
    // 보유 주식 감소 - 매도자
    await this.orderRepository.decreaseUserStockInfo(userStockIdObject.stockId, remainingQuantity, tx);

    // ___________2. 매수자의 기록 처리___________
    // 체결 기록 생성 - 매수자
    await this.orderRepository.createConcludedOrder(poppedArray.userId, orderData.companyId, poppedArray.type, poppedArray.price, remainingQuantity, tx);
    // 계좌 변동 - 매수자
    await this.orderRepository.decreaseUserCurrentMoney(poppedArray.userId, poppedArray.price * remainingQuantity, tx);
    // 보유 주식 증가 - 매수자
    await this.orderRepository.getUserStockInfo(poppedArray.userId, orderData.companyId).then((isStock) => {
      if (isStock) {
        const newAveragePrice = (isStock.averagePrice * isStock.quantity + poppedArray.price * remainingQuantity) / (isStock.quantity + remainingQuantity);
        return this.orderRepository.increaseUserStockInfo_shareholder(isStock.stockId, newAveragePrice, remainingQuantity, tx);
      } else {
        return this.orderRepository.increaseUserStockInfo_firstBuying(poppedArray.userId, orderData.companyId, poppedArray.price, remainingQuantity, tx);
      }
    });

    // 현재가 변경
    await this.orderRepository.changeCurrentPrice(orderData.companyId, poppedArray.price, tx);
  }

  // 초기 주문 처리-매수_____________________________________________________________________________
  async concludeInitialBuyingOrder(orderData, initialArray, remainingQuantity) {
    // initialArray의 각 주문에 대해 매수-매도 양측의 체결기록과 계좌 변동
    try {
      for (let concludedOrderInfo of initialArray) {
        await this.orderRepository.executeTransaction(async (tx) => {
          let userCurrentMoney = await this.orderRepository.getUserCurrentMoney(orderData.userId, tx);
          if (concludedOrderInfo.price * concludedOrderInfo.quantity > userCurrentMoney) {
            return { message: '체결과정에서 사용자의 잔고가 부족해져서 거래가 중단됐습니다.\n사용자의 잔액:', userCurrentMoney };
          }
          await this.orderConcludeBuyingProcess(orderData, concludedOrderInfo, tx);
          remainingQuantity -= concludedOrderInfo.quantity;
        });
      }
      return { message: '처리 성공', remainingQuantity };
    } catch (error) {
      console.error('order.service.concludeInitialOrder에서 에러가 발생했습니다.', error.message);
      return { message: '오류가 발생했습니다.', error: error.message };
    }
  }
  // 초기 주문 처리-매도_____________________________________________________________________________
  async concludeInitialSellingOrder(orderData, initialArray, remainingQuantity) {
    // initialArray의 각 주문에 대해 매수-매도 양측의 체결기록과 계좌 변동
    try {
      for (let concludedOrderInfo of initialArray) {
        await this.orderRepository.executeTransaction(async (tx) => {
          await this.orderConcludeSellingProcess(orderData, concludedOrderInfo, remainingQuantity, tx);
          remainingQuantity -= concludedOrderInfo.quantity;
        });
      }
      return { message: '처리 성공', remainingQuantity };
    } catch (error) {
      console.error('order.service.concludeInitialOrder에서 에러가 발생했습니다.', error.message);
      return { message: '오류가 발생했습니다.', error: error.message };
    }
  }

  // 마지막 주문 체결전 확인 및 처리과정-매도_____________________________________________________________________________
  async verifyLastOrder(lastOrder, remainingQuantity, orderData, tx) {
    // 마지막 주문의 물량 > 클라이언트의 주문 물량일 경우
    // 마지막 주문의 남는 부분을 다시 order테이블에 추가해야함
    if (lastOrder.quantity > remainingQuantity) {
      const newOrder = {
        userId: lastOrder.userId,
        companyId: orderData.companyId,
        type: lastOrder.type,
        price: lastOrder.price,
        quantity: lastOrder.quantity - remainingQuantity,
      };
      await this.orderRepository.createOrderByOrderData(newOrder, tx);
    }
    // 클라이언트가 원하는 만큼 order테이블에 주문이 없어서 부족할수도 있음.
    // 부족한 수량만큼 주문을 생성
    if (remainingQuantity > lastOrder.quantity) {
      const newOrder = {
        userId: orderData.userId,
        companyId: orderData.companyId,
        type: orderData.type,
        price: orderData.price,
        quantity: remainingQuantity - lastOrder.quantity,
      };
      await this.orderRepository.createOrderByOrderData(newOrder, tx);
      //부족한 양만큼 주문을 생성했으니 remainingQuantity를 체결가능한 양으로 조정
      remainingQuantity = lastOrder.quantity;
    }
  }

  //______________________________________________________주문 조회 요청____________________________________________________________________________________________________________________________________
  // 정렬방식: 시간, 회사별, 매수/매도, 체결여부
  getOrder = async (userId, name, type, order, isSold) => {
    try {
      const filterData = await this.orderRepository.filterData(userId, name, type, order, isSold);
      console.log(filterData);
      return filterData;
    } catch (error) {
      console.log(error.stack);
      return { message: '주문 조회 과정에서 에러가 발생했습니다.' };
    }
  };

  //__________________________________________________________주문 생성 요청_____________________________________________________________________________________________________________________________________
  //
  // __________________________________________시장가 주문 생성____________________________________________________________________________________
  postMarketPriceOrder = async (userId, receivedOrderData) => {
    const orderData = await this.orderRepository.addUserIdToOrderData(userId, receivedOrderData);
    try {
      if (orderData.type == 'sell') {
        // ---------------------------------------------시장가 '매도' ------------------------------------------
        let mostExpensiveBuyings = await this.orderRepository.getMostExpensiveBuyings(orderData.companyId, orderData.quantity);
        let totalPrice = 0;
        for (let price of mostExpensiveBuyings) {
          price += mostExpensiveBuyings.price * mostExpensiveBuyings.quantity;
          totalPrice += price;
        }
        // 현재 order테이블에 매수 주문이 없을 경우
        if (mostExpensiveBuyings.length == 0) {
          return { message: '매도가 불가합니다: 현재 해당 주식이 대해 매수 주문이 없습니다.' };
        }
        // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
        let lastExpensiveBuying = mostExpensiveBuyings.pop();
        let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량

        // 초기 주문 처리 - 해당 부분의 트랜잭션은 concludeInitialSellingOrder 내부에 구현되어 있습니다.
        // pop하고 나서도 mostExpensiveBuyings에 주문이 있을때
        if (lastExpensiveBuying.length > 0) {
          try {
            await this.concludeInitialSellingOrder(orderData, mostExpensiveBuyings, remainingQuantity, tx);
          } catch (error) {
            console.error(error.message);
            console.error(error.status);
            return { message: '시장가 주문 생성 과정에서 에러가 발생했습니다.' };
          }
        }
        await this.orderRepository.executeTransaction(async (tx) => {
          // 마지막 주문 체결 이전 확인
          await this.verifyLastOrder(lastExpensiveBuying, remainingQuantity, orderData, tx);

          // 마지막 주문 체결
          await this.orderConcludeSellingProcess(orderData, lastExpensiveBuying, remainingQuantity, tx);
        });
        return { message: '정상적으로 시장가 매도 주문이 처리되었습니다.' }; // 생성된 주문 결과 반환
      } else if (orderData.type == 'buy') {
        // ---------------------------------------------시장가 '매수' ------------------------------------------
        let mostCheapestSellings = await this.orderRepository.getMostCheapestSellings(orderData.companyId, orderData.quantity); // mostCheapestSellings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것
        if (mostCheapestSellings.length == 0) {
          return { message: '현재 시장가 매수가 불가합니다: 시장에 매도 주문이 없습니다.' };
        }
        // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
        let lastCheapestSelling = mostCheapestSellings.pop();
        let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량

        // pop하고 나서도 mostCheapestSellings에 주문이 있을때
        if (mostCheapestSellings.length > 0) {
          try {
            await this.concludeInitialBuyingOrder(orderData, mostCheapestSellings, remainingQuantity);
          } catch (error) {
            console.error(error.message);
            console.error(error.status);
            return { message: '시장가 주문 생성 과정에서 에러가 발생했습니다.' };
          }
        }

        await this.orderRepository.executeTransaction(async (tx) => {
          // 마지막 주문 체결 이전 확인
          await this.verifyLastOrder(lastCheapestSelling, remainingQuantity, orderData, tx);

          // 마지막 주문 체결
          await this.orderConcludeSellingProcess(orderData, lastCheapestSelling, remainingQuantity, tx);
        });

        return { message: '정상적으로 시장가 매도 주문이 처리되었습니다.' }; // 생성된 주문 결과 반환
      } else {
        return { message: '잘못된 주문 요청입니다. 매도/매수 주문만 가능합니다.' };
      }
    } catch (error) {
      console.log(error.message);
      console.log(error.status);
      return error('시장가 주문 생성 도중 에러가 발생했습니다.');
    }
  };

  //지정가 주문_______________________________________________________________________________________________________________________

  // 지정가 주문 생성
  postLimitedOrder = async (userId, orderDataFromController, correctedPrice) => {
    try {
      // 절삭된 가격의 적용
      const correctedOrderData = await this.orderRepository.changePriceOfData(orderDataFromController, correctedPrice);
      const orderData = await this.orderRepository.addUserIdToOrderData(userId, correctedOrderData);
      // 현재가 조회
      const currentPriceObject = await this.orderRepository.getCurrentPrice(orderData.companyId);
      const currentPrice = currentPriceObject.currentPrice;
      // 유저 현재 잔액 조회
      const userCurrentMoneyObject = await this.orderRepository.getUserCurrentMoney(orderData.userId);
      const userCurrentMoneyBigInt = userCurrentMoneyObject.currentMoney;
      const userCurrentMoney = Number(userCurrentMoneyBigInt);
      // 유저 현재 보유 주식량 조회
      const userCurrentStockQuantity = await this.orderRepository.getUserCurrentStockQuantity(orderData.userId, orderData.companyId);
      // -----------------------------------------------------------------1. 매도 주문------------------------------------------------------------------
      if (orderData.type == 'sell') {
        // 보유 주식이 없으면
        if (userCurrentStockQuantity == null) {
          return { message: '현재 해당 회사의 보유 주식이 없습니다.' };
        }
        // 매도 지정가가 시장가보다 낮을때 - 바로 체결되어야함
        if (orderData.price <= currentPrice) {
          // __**주문 정정 section에서도 동일하게 사용**___
          // 주문의 수량에 맞춰서 서버가 order테이블에서 ‘매수 주문중 가장 비싼’주문들에 대해 get 요청을 보냄
          // > 해당 주문들의 userId, orderId, price, quantity를 가져오고, 해당 주문들을 order테이블에서 삭제
          let mostExpensiveBuyings = await this.orderRepository.getMostExpensiveBuyings(orderData.companyId, orderData.quantity); // mostExpensiveBuyings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것
          if (userCurrentStockQuantity < orderData.quantity) {
            return { message: '매도가 불가합니다: 보유하고 계신 주식수보다 많은 수량을 매도주문하셨습니다.' };
          }
          // 현재 order테이블에 매수 주문이 없을 경우
          if (mostExpensiveBuyings.length == 0) {
            return { message: '매도가 불가합니다: 현재 해당 주식이 대해 매수 주문이 없습니다.' };
          }
          // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
          let lastExpensiveBuying = mostExpensiveBuyings.pop();

          let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량

          // 초기 주문 체결
          if (mostExpensiveBuyings.length > 0) {
            try {
              await this.concludeInitialSellingOrder(orderData, mostExpensiveBuyings, remainingQuantity);
            } catch (error) {
              console.log('order.service 지정가-매도-초기 거래 체결과정에서 에러가 발생했습니다\n', error.status);
            }
          }

          //마지막 주문 체결
          await this.orderRepository.executeTransaction(async (tx) => {
            // 마지막 주문 체결전 확인 및 처리과정
            try {
              await this.verifyLastOrder(lastExpensiveBuying, remainingQuantity, orderData, tx);
            } catch (error) {
              console.log('order.service 지정가-매도-마지막 체결 이전 verify과정에서 에러가 발생했습니다\n', error.status);
            }

            // last 주문 체결
            try {
              await this.orderConcludeSellingProcess(orderData, lastExpensiveBuying, remainingQuantity, tx);
            } catch (error) {
              console.log('order.service 지정가-매도-마지막 주문 체결과정에서 에러가 발생했습니다\n', error.status);
            }
          });

          return { message: '정상적으로 지정가 매도 주문이 처리되었습니다.' }; // 생성된 주문 결과 반환
        } else {
          // (orderData.price > currentPrice)
          // 매도 지정가가 현재가보다 높을때 - 지정가 매도 주문을 order테이블에 추가
          await this.orderRepository.createOrderByOrderData(orderData);
        }
      } else if (orderData.type == 'buy') {
        // -----------------------------------------------------------------2. 매수 주문------------------------------------------------------------------

        // 주문 총액 > 유저의 현재 잔고 일 경우 시작도 안함
        if (orderData.price * orderData.quantity > userCurrentMoney) {
          return { message: '주문총액보다 잔고가 부족합니다' };
        }
        console.log(orderData.price, currentPrice);
        console.log(orderData.price >= currentPrice);
        // 매수 지정가가 시장가보다 높을때 - 바로 체결되어야 함
        if (orderData.price >= currentPrice) {
          // 주문의 수량에 맞춰서 서버가 order테이블에서 ‘매도 주문중 가장 싼’주문들에 대해 get 요청을 보냄
          // > 해당 주문들의 userId, orderId, price, quantity를 가져오고, 해당 주문들을 order테이블에서 삭제
          let mostCheapestSellings = await this.orderRepository.getMostCheapestSellings(orderData.companyId, orderData.quantity); // mostCheapestSellings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것
          console.log(mostCheapestSellings);

          // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
          let lastCheapestSelling = mostCheapestSellings.pop();

          let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량이 앞으로 체결되면서 줄어들꺼임.
          console.log('매수 초기 거래 체결전');

          // 초기 주문 체결
          if (mostCheapestSellings.length > 0) {
            try {
              await this.concludeInitialBuyingOrder(orderData, mostCheapestSellings, remainingQuantity);
            } catch (error) {
              console.log('order.service 지정가-매수-초기거래 체결과정에서 에러가 발생했습니다\n', error.status);
            }
          }

          // 마지막 주문 체결
          await this.orderRepository.executeTransaction(async (tx) => {
            // 마지막 주문 체결전 확인 및 처리과정
            try {
              await this.verifyLastOrder(lastCheapestSelling, remainingQuantity, orderData, tx);
            } catch (error) {
              console.log('order.service 지정가-매수-마지막 체결 이전 verify과정에서 에러가 발생했습니다\n', error.status);
            }

            // last 주문 체결
            try {
              await this.orderConcludeBuyingProcess(orderData, lastCheapestSelling, remainingQuantity, tx);
            } catch (error) {
              console.log('order.service 지정가-매수-마지막 주문 체결과정에서 에러가 발생했습니다\n', error.message);
              console.log(error.stack);
            }
          });

          return { message: '정상적으로 지정가 매수 주문이 처리되었습니다.' };
        } else {
          // (orderData.price > currentPrice)
          // 매수 지정가 주문을 order테이블에 추가해야함
          await this.orderRepository.createOrderByOrderData(orderData);
          return { message: '정상적으로 지정가 주문이 생성되었습니다.' };
        }
      } else {
        return { message: '잘못된 주문 요청입니다. 매도/매수 주문만 가능합니다.' };
      }
    } catch (error) {
      console.log(error.message);
      console.log(error.stack);
      return { message: '지정가 주문 생성중에 문제가 생겼습니다.' };
    }
  };

  //____________________________________________________________________________주문 정정 요청_____________________________________________________________________________________________________

  updateOrder = async (userId, originalOrderId, receivedOrderData, correctedPrice) => {
    try {
      const {userIdOfOrder} = await this.orderRepository.getUserOfOrder(receivedOrderData.orderId);
      if(userId != userIdOfOrder){
        return {message:"본인의 주문만 정정할 수 있습니다."};
      }
      
      const correctedOrderData = await this.orderRepository.changePriceOfData(receivedOrderData, correctedPrice);
      const orderData = await this.orderRepository.addUserIdToOrderData(userId, correctedOrderData);
      // 현재가 조회
      const currentPrice = await this.orderRepository.getCurrentPrice(orderData.companyId);

      // 정정주문의 총액보다 계좌잔고가 적을때
      const userCurrentMoney = await this.orderRepository.getUserCurrentMoney(userId);
      const totalPrice = orderData.price * orderData.quantity;
      if (userCurrentMoney < totalPrice) {
        return { message: '주문 정정에 필요한 잔고가 부족합니다.' };
      }

      // 기존 주문을 삭제
      try {
        await this.orderRepository.deleteOrderByOrderId(orderData.userId, originalOrderId);
      } catch (error) {
        console.log('orderId를 잘못 입력했거나 해당 order의 생성자가 아닙니다.', error.stack);
        return { message: '주문번호를 잘못 입력했거나 해당 주문의 생성자가 아닙니다.' };
      }

      // 이하 새로 정정 주문 생성 - 지정가 로직에 오타있으면 여기도 싹다 오타...

      if ((orderData.type == 'sell') & (orderData.price <= currentPrice)) {
        // 보유 주식이 없으면
        if (userCurrentStockQuantity == null) {
          return { message: '현재 해당 회사의 보유 주식이 없습니다.' };
        }
        // 매도 지정가가 시장가보다 낮을때 - 바로 체결되어야함
        if (orderData.price <= currentPrice) {
          // __**주문 정정 section에서도 동일하게 사용**___
          // 주문의 수량에 맞춰서 서버가 order테이블에서 ‘매수 주문중 가장 비싼’주문들에 대해 get 요청을 보냄
          // > 해당 주문들의 userId, orderId, price, quantity를 가져오고, 해당 주문들을 order테이블에서 삭제
          let mostExpensiveBuyings = await this.orderRepository.getMostExpensiveBuyings(orderData.companyId, orderData.quantity); // mostExpensiveBuyings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것
          if (userCurrentStockQuantity < orderData.quantity) {
            return { message: '매도가 불가합니다: 보유하고 계신 주식수보다 많은 수량을 매도주문하셨습니다.' };
          }
          // 현재 order테이블에 매수 주문이 없을 경우
          if (mostExpensiveBuyings.length == 0) {
            return { message: '매도가 불가합니다: 현재 해당 주식이 대해 매수 주문이 없습니다.' };
          }
          // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
          let lastExpensiveBuying = mostExpensiveBuyings.pop();

          let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량

          // 초기 주문 체결
          if (mostExpensiveBuyings.length > 0) {
            try {
              await this.concludeInitialSellingOrder(orderData, mostExpensiveBuyings, remainingQuantity);
            } catch (error) {
              console.log('order.service 정정-매도-초기 거래 체결과정에서 에러가 발생했습니다\n', error.status);
            }
          }

          //마지막 주문 체결
          await this.orderRepository.executeTransaction(async (tx) => {
            // 마지막 주문 체결전 확인 및 처리과정
            try {
              await this.verifyLastOrder(lastExpensiveBuying, remainingQuantity, orderData, tx);
            } catch (error) {
              console.log('order.service 정정-매도-마지막 체결 이전 verify과정에서 에러가 발생했습니다\n', error.status);
            }

            // last 주문 체결
            try {
              await this.orderConcludeSellingProcess(orderData, lastExpensiveBuying, remainingQuantity, tx);
            } catch (error) {
              console.log('order.service 정정-매도-마지막 주문 체결과정에서 에러가 발생했습니다\n', error.status);
            }
          });

          return { message: '정상적으로 정정 매도 주문이 처리되었습니다.' }; // 생성된 주문 결과 반환
        } else {
          // (orderData.price > currentPrice)
          // 매도 지정가가 현재가보다 높을때 - 지정가 매도 주문을 order테이블에 추가
          await this.orderRepository.createOrderByOrderData(orderData);
        }
      } else if ((orderData.type == 'buy') & (orderData.price >= currentPrice)) {
        // -----------------------------------------------------------------2. 매수 주문------------------------------------------------------------------

        // 주문 총액 > 유저의 현재 잔고 일 경우 시작도 안함
        if (orderData.price * orderData.quantity > userCurrentMoney) {
          return { message: '주문총액보다 잔고가 부족합니다' };
        }
        console.log(orderData.price, currentPrice);
        console.log(orderData.price >= currentPrice);
        // 매수 지정가가 시장가보다 높을때 - 바로 체결되어야 함
        if (orderData.price >= currentPrice) {
          // 주문의 수량에 맞춰서 서버가 order테이블에서 ‘매도 주문중 가장 싼’주문들에 대해 get 요청을 보냄
          // > 해당 주문들의 userId, orderId, price, quantity를 가져오고, 해당 주문들을 order테이블에서 삭제
          let mostCheapestSellings = await this.orderRepository.getMostCheapestSellings(orderData.companyId, orderData.quantity); // mostCheapestSellings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것
          console.log(mostCheapestSellings);

          // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
          let lastCheapestSelling = mostCheapestSellings.pop();

          let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량이 앞으로 체결되면서 줄어들꺼임.
          console.log('매수 초기 거래 체결전');

          // 초기 주문 체결
          if (mostCheapestSellings.length > 0) {
            try {
              await this.concludeInitialBuyingOrder(orderData, mostCheapestSellings, remainingQuantity);
            } catch (error) {
              console.log('order.service 정정-매수-초기거래 체결과정에서 에러가 발생했습니다\n', error.status);
            }
          }

          // 마지막 주문 체결
          await this.orderRepository.executeTransaction(async (tx) => {
            // 마지막 주문 체결전 확인 및 처리과정
            try {
              await this.verifyLastOrder(lastCheapestSelling, remainingQuantity, orderData, tx);
            } catch (error) {
              console.log('order.service 정정-매수-마지막 체결 이전 verify과정에서 에러가 발생했습니다\n', error.status);
            }

            // last 주문 체결
            try {
              await this.orderConcludeBuyingProcess(orderData, lastCheapestSelling, remainingQuantity, tx);
            } catch (error) {
              console.log('order.service 정정-매수-마지막 주문 체결과정에서 에러가 발생했습니다\n', error.message);
              console.log(error.stack);
            }
          });

          return { message: '정상적으로 정정 매수 주문이 처리되었습니다.' };
        } else {
          // (orderData.price > currentPrice)
          // 매수 지정가 주문을 order테이블에 추가해야함
          await this.orderRepository.createOrderByOrderData(orderData);
          return { message: '정상적으로 정정 주문이 생성되었습니다.' };
        }
      } else {
        await this.orderRepository.createOrderByOrderData(orderData);
        return { message: '정상적으로 주문 정정이 완료되었습니다.' };
      }
    } catch (error) {
      console.log(error.stack);
      return { error: true, message: '해당 주문을 주문내역에 추가하지 못했습니다.' };
    }
  };

  // 1) controller->service로 들어가자마자 사용자의 잔고를 판단, 부족하면 해당 주문 자체를 삭제
  // 	 -> service 파트에서 추가
  // 2) 현재가와 해당 주문을 대조해서
  //    if)    ‘매도가<=현재가 ,매수가>=현재가' 경우에 현재가로 주문을 체결시킴 --> order에 isSold: true 상태로 데이터 추가
  //    else) 그렇지 않을 경우에는 --> order테이블에 isSold: false 상태로 데이터를 추가
  //     -> 장중에만 활성화되도록 (클라이언트로부터 서버가 받은query파라미터로 판단).
  // 	 -> service 파트에서 추가
  //주문 삭제 요청
  //
  //_______________________________________________________________________________________________________________________
  deleteOrder = async (userId, orderId) => {
    try {
      const targetData = await this.orderRepository.findOrderByOrderId(userId, orderId);
      if (targetData == null) {
        return { message: '존재하지 않는 주문입니다.' };
      }
      console.log(targetData);
      if (targetData.isSold == true) {
        return { message: '이미 체결된 주문입니다.' };
      } else {
        const deleteOrder = await this.orderRepository.deleteOrderByOrderId(userId, orderId);
        return deleteOrder;
      }
    } catch (error) {
      console.error(error.stack);
      return { error: true, message: '주문 취소 과정에서 에러가 발생했습니다.' };
    }
  };
}