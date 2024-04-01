// 워낙 코드가 복잡해서 지속적인 테스트를 위해서 잡다한 console.log를 살려뒀습니다. //
// 어느정도 기간이 지나고 테스트가 끝나면 지우겠습니다. //
// 최대한 주석을 달아봤는데 추가로 달아주시면 매우 감사합니다. //

export class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
    this.orderConcludeProcess = this.orderConcludeProcess.bind(this);
    this.orderConcludeProcessOfLastOrder = this.orderConcludeProcessOfLastOrder.bind(this);
  }

  // 특정 조건에 따라 order테이블에서 불러온 주문들에서 마지막 주문을 lastOrder로 분리하고, 나머지 주문들은 orderConcludeProcess에서 처리하고 lastOrder은 orderConcludeProcessOfLastOrder에서 처리합니다.
  async orderConcludeProcess(orderData, concludedOrderInfo) {
    let transactionPromises = [];
    // ___________1. 매도자의 기록 처리___________
    // 체결 기록 생성- 매도자
    transactionPromises.push(this.orderRepository.createConcludedOrder(orderData.userId, orderData.companyId, orderData.type, concludedOrderInfo.price, concludedOrderInfo.quantity));
    // 계좌 변동 - 매도자
    transactionPromises.push(this.orderRepository.increaseUserCurrentMoney(orderData.userId, concludedOrderInfo.price * concludedOrderInfo.quantity));
    // 보유 주식 증가 - 매도자
    transactionPromises.push(this.orderRepository.decreaseUserStockInfo(orderData.userId, orderData.companyId, orderData.quantity));

    // ___________2. 매수자의 기록 처리___________
    // 체결 기록 생성 - 매수자
    transactionPromises.push(this.orderRepository.createConcludedOrder(concludedOrderInfo.userId, orderData.companyId, concludedOrderInfo.type, concludedOrderInfo.price, concludedOrderInfo.quantity));
    // 계좌 변동 - 매수자
    transactionPromises.push(this.orderRepository.decreaseUserCurrentMoney(concludedOrderInfo.userId, concludedOrderInfo.price * concludedOrderInfo.quantity));
    // 보유 주식 증가 - 매수자
    const isStock = await this.orderRepository.getUserStockInfo(concludedOrderInfo.userId, orderData.companyId);
    if (isStock) {
      const newAveragePrice = (isStock.averagePrice * isStock.quantity + concludedOrderInfo.price * concludedOrderInfo.quantity) / (isStock.quantity + concludedOrderInfo.quantity);
      transactionPromises.push(this.orderRepository.increaseUserStockInfo_shareholder(concludedOrderInfo.userId, orderData.companyId, newAveragePrice, concludedOrderInfo.quantity));
    } else {
      transactionPromises.push(this.orderRepository.increaseUserStockInfo_firstBuying(concludedOrderInfo.userId, orderData.companyId, concludedOrderInfo.price, concludedOrderInfo.quantity));
    }
    // 현재가를 변경
    transactionPromises.push(this.orderRepository.changeCurrentPrice(orderData.companyId, concludedOrderInfo.price));
    await this.orderRepository.$transaction(transactionPromises);
  }

  //주문 조회 요청
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
  // 사용자한테 보여줄때 어떤 데이터가 필요한지를 쿼리파라미터로 식별해서 다르게 보냄.
  // 정렬방식: 시간, 회사별, 매수/매도, 체결여부
  //  -> service 파트에서 추가

  //_______________________________________________________________________________________________________________________
  //
  // 시장가 주문 생성
  postMarketPriceOrder = async (userId, receivedOrderData) => {
    let orderData = await this.orderRepository.addUserIdToOrderData(userId, receivedOrderData);
    try {
      // 매도/매수 구분해서 처리---------------------------------------------------------------------------------------------------
      // -----------------------------------------------------------------1. 매도 주문------------------------------------------------------------------

      if (orderData.type == 'sell') {
        // 주문의 수량에 맞춰서 서버가 order테이블에서 ‘매수 주문중 가장 비싼’주문들에 대해 get 요청을 보냄
        // > 해당 주문들의 userId, orderId, price, quantity를 가져오고, 해당 주문들을 order테이블에서 삭제
        let mostExpensiveBuyings = await this.orderRepository.getMostExpensiveBuyings(orderData.companyId, orderData.quantity); // mostExpensiveBuyings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것

        // 현재 order테이블에 매수 주문이 없을 경우
        if (mostExpensiveBuyings.length == 0) {
          return { message: '매도가 불가합니다: 현재 해당 주식이 대해 매수 주문이 없습니다.' };
        }
        // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
        let lastExpensiveBuying = mostExpensiveBuyings.pop();

        let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량

        // pop하고 나서도 mostExpensiveBuyings에 주문이 있을때
        if (mostExpensiveBuyings.length > 0) {
          // mostExpensiveBuyings의 각 주문에 대해 매수-매도 양측의 체결기록과 계좌 변동
          for (let concludedOrderInfo of mostExpensiveBuyings) {
            await this.orderConcludeProcess(orderData, concludedOrderInfo);
            remainingQuantity -= concludedOrderInfo.quantity;
          }
        }
        // 만약에 매도자의 매도 수량이 매수자의 매수 수량보다 적을 경우 매수자의 남은 매수 수량만큼 매수 주문을 다시 만들어줘야함.

        let transactionPromises = [];

        if (lastExpensiveBuying.quantity > remainingQuantity) {
          const newBuyingOrder = {
            userId: lastExpensiveBuying.userId,
            companyId: orderData.companyId,
            type: lastExpensiveBuying.type,
            price: lastExpensiveBuying.price,
            quantity: lastExpensiveBuying.quantity - remainingQuantity,
          };
          transactionPromises.push(this.orderRepository.createOrderByOrderData(newBuyingOrder));
        }
        if (remainingQuantity > lastExpensiveBuying.quantity) {
          // 반대로 매수자(클라이언트)가 원하는 만큼 매도주문이 없어서 부족할수도 있음. 그런 경우 remainingQuantity를 남은 매도주량에 맞춰줘야함.
          remainingQuantity = lastExpensiveBuying.quantity;
        }

        // ___________1. 매도자의 기록 처리___________
        // 체결 기록 생성- 매도자
        transactionPromises.push(this.orderRepository.createConcludedOrder(orderData.userId, orderData.companyId, orderData.type, lastExpensiveBuying.price, remainingQuantity));
        // 계좌 변동 - 매도자
        transactionPromises.push(this.orderRepository.increaseUserCurrentMoney(orderData.userId, lastExpensiveBuying.price * remainingQuantity));
        // 보유 주식 증가 - 매도자
        transactionPromises.push(this.orderRepository.decreaseUserStockInfo(userId, companyId, remainingQuantity));
        // ___________2. 매수자의 기록 처리___________
        // 체결 기록 생성 - 매수자
        transactionPromises.push(this.orderRepository.createConcludedOrder(lastExpensiveBuying.userId, orderData.companyId, lastExpensiveBuying.type, lastExpensiveBuying.price, remainingQuantity));
        // 만약에 매도자의 매도 수량이 매수자의 매수 수량보다 적을 경우 매수자의 남은 매수 수량만큼 매수 주문을 다시 만들어줘야함.

        // 계좌 변동 - 매수자
        transactionPromises.push(this.orderRepository.decreaseUserCurrentMoney(lastExpensiveBuying.userId, lastExpensiveBuying.price * remainingQuantity));
        // 보유 주식 증가 - 매수자
        const isStock = await this.orderRepository.getUserStockInfo(lastExpensiveBuying.userId, orderData.companyId);
        if (isStock) {
          const newAveragePrice = (isStock.averagePrice * isStock.quantity + lastExpensiveBuying.price * remainingQuantity) / (isStock.quantity + remainingQuantity);
          transactionPromises.push(this.orderRepository.increaseUserStockInfo_shareholder(lastExpensiveBuying.userId, orderData.companyId, newAveragePrice, remainingQuantity));
        } else {
          transactionPromises.push(this.orderRepository.increaseUserStockInfo_firstSelling(lastExpensiveBuying.userId, orderData.companyId, lastExpensiveBuying.price, remainingQuantity));
        }
        // 현재가를 변경
        transactionPromises.push(this.orderRepository.changeCurrentPrice(orderData.companyId, lastExpensiveBuying.price));
        await this.orderRepository.$transaction(transactionPromises);

        return { message: '정상적으로 시장가 매도 주문이 처리되었습니다.' }; // 생성된 주문 결과 반환
      } //------------------------------------------------------------------ 2. 매수 주문--------------------------------------------------------------------------------
      else if (orderData.type == 'buy') {
        // 주문의 수량에 맞춰서 서버가 order테이블에서 ‘매도 주문중 가장 싼’주문들에 대해 get 요청을 보냄
        // > 해당 주문들의 userId, orderId, price, quantity를 가져오고, 해당 주문들을 order테이블에서 삭제
        let mostCheapestSellings = await this.orderRepository.getMostCheapestSellings(orderData.companyId, orderData.quantity); // mostCheapestSellings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것

        // 현재 order테이블에 매도 주문이 없을 경우
        if (mostCheapestSellings.length == 0) {
          return { message: '매수가 불가합니다: 현재 해당 주식이 대해 매도 주문이 없습니다.' };
        }
        // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
        let lastCheapestSelling = mostCheapestSellings.pop();

        let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량

        // pop하고 나서도 mostCheapestSellings에 주문이 있을때
        if (mostCheapestSellings.length > 0) {
          // mostCheapestSellings의 각 주문에 대해 매수-매도 양측의 체결기록과 계좌 변동
          // 내가 샀으니 상대방(판매자)와 내 기록을 변동해줘야함
          for (let concludedOrderInfo of mostCheapestSellings) {
            await this.orderConcludeProcess(orderData, concludedOrderInfo);
            remainingQuantity -= concludedOrderInfo.quantity;
          }
        }

        // 그럼 현재 remainingQuantity 만큼 매도 수량이 남음
        // 남은 주문 수량만큼 주문자의 체결 데이터를 lastCheapestSelling의 가격으로 생성
        let transactionPromises = [];

        if (lastCheapestSelling.quantity > remainingQuantity) {
          const newBuyingOrder = {
            userId: lastCheapestSelling.userId,
            companyId: orderData.companyId,
            type: lastCheapestSelling.type,
            price: lastCheapestSelling.price,
            quantity: lastCheapestSelling.quantity - remainingQuantity,
          };
          transactionPromises.push(this.orderRepository.createOrderByOrderData(newBuyingOrder));
        }
        if (remainingQuantity > lastCheapestSelling.quantity) {
          // 반대로 매수자(클라이언트)가 원하는 만큼 매도주문이 없어서 부족할수도 있음. 그런 경우 remainingQuantity를 남은 매도주량에 맞춰줘야함.
          remainingQuantity = lastCheapestSelling.quantity;
        }

        // ___________1. 매도자의 기록 처리___________
        // 체결 기록 생성- 매도자
        transactionPromises.push(this.orderRepository.createConcludedOrder(orderData.userId, orderData.companyId, orderData.type, lastCheapestSelling.price, remainingQuantity));
        // 계좌 변동 - 매도자
        transactionPromises.push(this.orderRepository.increaseUserCurrentMoney(orderData.userId, lastCheapestSelling.price * remainingQuantity));
        // 보유 주식 증가 - 매도자
        transactionPromises.push(this.orderRepository.decreaseUserStockInfo(userId, companyId, remainingQuantity));
        // ___________2. 매수자의 기록 처리___________
        // 체결 기록 생성 - 매수자
        transactionPromises.push(this.orderRepository.createConcludedOrder(lastCheapestSelling.userId, orderData.companyId, lastCheapestSelling.type, lastCheapestSelling.price, remainingQuantity));
        // 만약에 매도자의 매도 수량이 매수자의 매수 수량보다 적을 경우 매수자의 남은 매수 수량만큼 매수 주문을 다시 만들어줘야함.

        // 계좌 변동 - 매수자
        transactionPromises.push(this.orderRepository.decreaseUserCurrentMoney(lastCheapestSelling.userId, lastCheapestSelling.price * remainingQuantity));
        // 보유 주식 증가 - 매수자
        const isStock = await this.orderRepository.getUserStockInfo(lastCheapestSelling.userId, orderData.companyId);
        if (isStock) {
          const newAveragePrice = (isStock.averagePrice * isStock.quantity + lastCheapestSelling.price * remainingQuantity) / (isStock.quantity + remainingQuantity);
          transactionPromises.push(this.orderRepository.increaseUserStockInfo_shareholder(lastCheapestSelling.userId, orderData.companyId, newAveragePrice, remainingQuantity));
        } else {
          transactionPromises.push(this.orderRepository.increaseUserStockInfo_firstSelling(lastCheapestSelling.userId, orderData.companyId, lastCheapestSelling.price, remainingQuantity));
        }
        // 현재가를 변경
        transactionPromises.push(this.orderRepository.changeCurrentPrice(orderData.companyId, lastCheapestSelling.price));
        await this.orderRepository.$transaction(transactionPromises);

        return { message: '정상적으로 시장가 매도 주문이 처리되었습니다.' }; // 생성된 주문 결과 반환
      } // 3. 매도/매수 주문이 아닐 경우------------------------------------------------------
      else {
        return { message: '잘못된 주문 요청입니다. 매도/매수 주문만 가능합니다.' };
      }
    } catch (error) {
      console.log(error.stack);
      return { error, message: '시장가 주문 생성중에 문제가 생겼습니다. 정확한 문제를 확인하기 위해 고객센터로 연락해주세요. 담당자: 최준혁' };
    }
  };

  //_______________________________________________________________________________________________________________________

  // 지정가 주문 생성
  postLimitedOrder = async (userId, orderDataFromController, correctedPrice) => {
    const correctedOrderData = await this.orderRepository.changePriceOfData(orderDataFromController, correctedPrice);
    const orderData = await this.orderRepository.addUserIdToOrderData(userId, correctedOrderData);
    try {
      // -----------------------------------------------------------------1. 매도 주문------------------------------------------------------------------
      if (orderData.type == 'sell') {
        // 매도 지정가가 시장가보다 낮을때
        if (orderData.price <= currentPrice) {
          // 주문의 수량에 맞춰서 서버가 order테이블에서 ‘매수 주문중 가장 비싼’주문들에 대해 get 요청을 보냄
          // > 해당 주문들의 userId, orderId, price, quantity를 가져오고, 해당 주문들을 order테이블에서 삭제
          let mostExpensiveBuyings = await this.orderRepository.getMostExpensiveBuyings(orderData.companyId, orderData.quantity); // mostExpensiveBuyings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것

          // 현재 order테이블에 매수 주문이 없을 경우
          if (mostExpensiveBuyings.length == 0) {
            return { message: '매도가 불가합니다: 현재 해당 주식이 대해 매수 주문이 없습니다.' };
          }
          // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
          let lastExpensiveBuying = mostExpensiveBuyings.pop();

          let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량

          // pop하고 나서도 mostExpensiveBuyings에 주문이 있을때
          if (mostExpensiveBuyings.length > 0) {
            // mostExpensiveBuyings의 각 주문에 대해 매수-매도 양측의 체결기록과 계좌 변동
            for (let concludedOrderInfo of mostExpensiveBuyings) {
              await this.orderConcludeProcess(orderData, concludedOrderInfo);
              remainingQuantity -= concludedOrderInfo.quantity;
            }
          }
          // 만약에 매도자의 매도 수량이 매수자의 매수 수량보다 적을 경우 매수자의 남은 매수 수량만큼 매수 주문을 다시 만들어줘야함.

          let transactionPromises = [];

          if (lastExpensiveBuying.quantity > remainingQuantity) {
            const newBuyingOrder = {
              userId: lastExpensiveBuying.userId,
              companyId: orderData.companyId,
              type: lastExpensiveBuying.type,
              price: lastExpensiveBuying.price,
              quantity: lastExpensiveBuying.quantity - remainingQuantity,
            };
            transactionPromises.push(this.orderRepository.createOrderByOrderData(newBuyingOrder));
          }

          let stillRemainingQuantity;
          if (remainingQuantity > lastExpensiveBuying.quantity) {
            // 반대로 매도자(클라이언트)가 원하는 만큼 매수주문이 없어서 부족할수도 있음. 그런 경우 remainingQuantity를 남은 매수 수량에 맞춰줘야함.
            stillRemainingQuantity = remainingQuantity - lastExpensiveBuying.quantity;
            remainingQuantity = lastExpensiveBuying.quantity;
            const newSellingOrder = {
              userId: orderData.userId,
              companyId: orderData.companyId,
              type: orderData.type,
              price: orderData.price,
              quantity: remainingQuantity,
            };
            transactionPromises.push(this.orderRepository.createOrderByOrderData(newSellingOrder));
          }
          // 그럼 현재 remainingQuantity 만큼 매도 수량이 남음
          // 남은 주문 수량만큼 주문자의 체결 데이터를 lastExpensiveBuying의 가격으로 생성

          // ___________1. 매도자의 기록 처리___________
          // 체결 기록 생성- 매도자
          transactionPromises.push(this.orderRepository.createConcludedOrder(orderData.userId, orderData.companyId, orderData.type, lastExpensiveBuying.price, remainingQuantity));
          // 계좌 변동 - 매도자
          transactionPromises.push(this.orderRepository.increaseUserCurrentMoney(orderData.userId, lastExpensiveBuying.price * remainingQuantity));
          // 보유 주식 증가 - 매도자
          transactionPromises.push(this.orderRepository.decreaseUserStockInfo(userId, companyId, remainingQuantity));

          // ___________2. 매수자의 기록 처리___________
          // 체결 기록 생성 - 매수자
          transactionPromises.push(this.orderRepository.createConcludedOrder(lastExpensiveBuying.userId, orderData.companyId, lastExpensiveBuying.type, lastExpensiveBuying.price, remainingQuantity));

          // 계좌 변동 - 매수자
          transactionPromises.push(this.orderRepository.decreaseUserCurrentMoney(lastExpensiveBuying.userId, lastExpensiveBuying.price * remainingQuantity));
          // 보유 주식 증가 - 매수자
          const isStock = await this.orderRepository.getUserStockInfo(lastExpensiveBuying.userId, orderData.companyId);
          if (isStock) {
            const newAveragePrice = (isStock.averagePrice * isStock.quantity + lastExpensiveBuying.price * remainingQuantity) / (isStock.quantity + remainingQuantity);
            transactionPromises.push(this.orderRepository.increaseUserStockInfo_shareholder(lastExpensiveBuying.userId, orderData.companyId, newAveragePrice, remainingQuantity));
          } else {
            transactionPromises.push(this.orderRepository.increaseUserStockInfo_firstBuying(lastExpensiveBuying.userId, orderData.companyId, lastExpensiveBuying.price, remainingQuantity));
          }
          // 현재가를 변경
          transactionPromises.push(this.orderRepository.changeCurrentPrice(orderData.companyId, lastExpensiveBuying.price));
          await this.orderRepository.$transaction(transactionPromises);

          return { message: '정상적으로 지정가 매도 주문이 처리되었습니다.' }; // 생성된 주문 결과 반환
        } else {
          // (orderData.price > currentPrice)
          await this.orderRepository.createOrderByOrderData(orderData);
        }
      } else if (orderData.tpye == 'buy') {
        // 매수 지정가가 시장가보다 높을때
        if (orderData.price <= currentPrice) {
          // 주문의 수량에 맞춰서 서버가 order테이블에서 ‘매도 주문중 가장 싼’주문들에 대해 get 요청을 보냄
          // > 해당 주문들의 userId, orderId, price, quantity를 가져오고, 해당 주문들을 order테이블에서 삭제
          let mostCheapestSellings = await this.orderRepository.getMostCheapestSellings(orderData.companyId, orderData.quantity); // mostCheapestSellings는 [{userId:1, orderId:2, price:30000, quantity:40},{},{},...] 이런형태일 것

          // 현재 order테이블에 매도 주문이 없을 경우
          if (mostCheapestSellings.length == 0) {
            return { message: '매수가 불가합니다: 현재 해당 주식이 대해 매도 주문이 없습니다.' };
          }
          // 가져온 데이터의 마지막 데이터는 전부 체결이 안될수도 있으므로 따로 관리
          let lastCheapestSelling = mostCheapestSellings.pop();

          let remainingQuantity = orderData.quantity; // 매도 주문의 잔여 매도 수량

          // pop하고 나서도 mostCheapestSellings에 주문이 있을때
          if (mostCheapestSellings.length > 0) {
            // mostCheapestSellings의 각 주문에 대해 매수-매도 양측의 체결기록과 계좌 변동
            // 내가 샀으니 상대방(판매자)와 내 기록을 변동해줘야함
            for (let concludedOrderInfo of mostCheapestSellings) {
              await this.orderConcludeProcess(orderData, concludedOrderInfo);
              remainingQuantity -= concludedOrderInfo.quantity;
            }
          }

          // 그럼 현재 remainingQuantity 만큼 매도 수량이 남음
          // 남은 주문 수량만큼 주문자의 체결 데이터를 lastCheapestSelling의 가격으로 생성
          let transactionPromises = [];
          if (lastCheapestSelling.quantity > remainingQuantity) {
            const newSellingOrder = {
              userId: lastCheapestSelling.userId,
              companyId: orderData.companyId,
              type: lastCheapestSelling.type,
              price: lastCheapestSelling.price,
              quantity: lastCheapestSelling.quantity - remainingQuantity,
            };
            transactionPromises.push(this.orderRepository.createOrderByOrderData(newSellingOrder));
          }
          if (remainingQuantity > lastCheapestSelling.quantity) {
            // 반대로 매수자(클라이언트)가 원하는 만큼 매도주문이 없어서 부족할수도 있음. 그런 경우 remainingQuantity를 남은 매도주량에 맞춰줘야함.
            remainingQuantity = lastCheapestSelling.quantity;
          }

          // ___________1. 매도자의 기록 처리___________
          // 체결 기록 생성- 매도자
          transactionPromises.push(this.orderRepository.createConcludedOrder(orderData.userId, orderData.companyId, orderData.type, lastCheapestSelling.price, remainingQuantity));
          // 계좌 변동 - 매도자
          transactionPromises.push(this.orderRepository.increaseUserCurrentMoney(orderData.userId, lastCheapestSelling.price * remainingQuantity));
          // 보유 주식 증가 - 매도자
          transactionPromises.push(this.orderRepository.decreaseUserStockInfo(userId, companyId, remainingQuantity));
          // ___________2. 매수자의 기록 처리___________
          // 체결 기록 생성 - 매수자
          transactionPromises.push(this.orderRepository.createConcludedOrder(lastCheapestSelling.userId, orderData.companyId, lastCheapestSelling.type, lastCheapestSelling.price, remainingQuantity));
          // 만약에 매도자의 매도 수량이 매수자의 매수 수량보다 적을 경우 매수자의 남은 매수 수량만큼 매수 주문을 다시 만들어줘야함.

          // 계좌 변동 - 매수자
          transactionPromises.push(this.orderRepository.decreaseUserCurrentMoney(lastCheapestSelling.userId, lastCheapestSelling.price * remainingQuantity));
          // 보유 주식 증가 - 매수자
          const isStock = await this.orderRepository.getUserStockInfo(lastCheapestSelling.userId, orderData.companyId);
          if (isStock) {
            const newAveragePrice = (isStock.averagePrice * isStock.quantity + lastCheapestSelling.price * remainingQuantity) / (isStock.quantity + remainingQuantity);
            transactionPromises.push(this.orderRepository.increaseUserStockInfo_shareholder(lastCheapestSelling.userId, orderData.companyId, newAveragePrice, remainingQuantity));
          } else {
            transactionPromises.push(this.orderRepository.increaseUserStockInfo_firstSelling(lastCheapestSelling.userId, orderData.companyId, lastCheapestSelling.price, remainingQuantity));
          }
          // 현재가를 변경
          transactionPromises.push(this.orderRepository.changeCurrentPrice(orderData.companyId, lastCheapestSelling.price));
          await this.orderRepository.$transaction(transactionPromises);

          return { message: '정상적으로 시장가 매도 주문이 처리되었습니다.' };
        } else {
          // (orderData.price > currentPrice)
          await this.orderRepository.createOrderByOrderData(orderData);
        }
      } else {
        return { message: '잘못된 주문 요청입니다. 매도/매수 주문만 가능합니다.' };
      }
    } catch (error) {
      console.log(error.stack);
      return { error, message: '지정가 주문 생성중에 문제가 생겼습니다. 정확한 문제를 확인하기 위해 고객센터로 연락해주세요. 담당자: 최준혁' };
    }
  };

  //_______________________________________________________________________________________________________________________
  //주문 정정 요청
  updateOrder = async (userId, orderId, orderData) => {
    // 1) controller->service로 들어가자마자 사용자의 잔고를 판단, 부족하면 해당 주문 자체를 삭제
    const orderedValue = orderData.price * orderData.quantity;
    const currentCash = await this.orderRepository.findAvailableCash(userId);
    const totalPrice = orderData.price * orderData.quantity;
    if (currentCash < totalPrice) {
      try {
        const deletedByLack = await this.orderRepository.deleteOrderByOrderId(orderId);
        return { deletedByLack, message: '예수금이 부족합니다.' };
      } catch (error) {
        console.log(error.stack);
        return { error: true, message: error.message };
      }
    }
    // 현재가와 매수/매도가 비교해서 isSold 판단& isSold:true는 유저의 계좌상황 변동
    // const currentPrice = this.cur;                               // 실제 데이터 받아오면 이부분 변동 필요!!
    const currentPrice = orderData.price - 1; //                        여기서 '현재가' 조절하시면 됩니다!!
    let updatedOrderData = orderData;
    let targetData = await this.orderRepository.findTargetData(orderId);
    if (targetData.isSold == 'true') {
      return { message: '이미 체결된 주문입니다.' };
    }
    let isSold = targetData.isSold;
    if (targetData.type == 'buy' && currentPrice <= orderData.price) {
      try {
        // stock테이블에 해당되는 데이터가 있는지 조회
        const stockDataWithBoolean = await this.orderRepository.isStockExisting(userId, orderData);
        const stockData = stockDataWithBoolean.stockData;
        const isStock = stockDataWithBoolean.isStock;
        const stockId = stockData.stockId;
        // 현재 평균가, 수량, add후 변경될 평균가 계산
        const currentAveragePrice = stockData ? stockData.averagePrice : 0;
        const currentQuantity = stockData ? stockData.quantity : 0;
        const changedAveragePrice = isStock ? (currentAveragePrice * currentQuantity + orderedValue) / (currentQuantity + orderData.quantity) : orderData.price;
        isSold = true;

        await this.orderRepository.concludeBuyoutOrder(userId, orderData, orderedValue, isStock, changedAveragePrice, stockId);
      } catch (error) {
        console.log(error.stack);
        return { error: true, message: '매수 주문에 대해 계좌에 접근하는 과정에서 문제가 발생했습니다.' };
      }
      updatedOrderData = { ...orderData, isSold: true };
    }
    if (targetData.type == 'sell' && currentPrice >= orderData.price) {
      try {
        const stockDataWithBoolean = await this.orderRepository.isStockExisting(userId, orderData);
        const stockData = stockDataWithBoolean.stockData;
        const stockId = stockData.stockId;
        isSold = true;
        await this.orderRepository.concludeSaleOrder(userId, orderData, orderedValue, stockId);
      } catch (error) {
        console.log(error.stack);
        return { error: true, message: '매수 주문에 대해 계좌에 접근하는 과정에서 문제가 발생했습니다.' };
      }
      updatedOrderData = { ...orderData, isSold: true };
    }

    // db에서 주문목록 변경
    try {
      const changedOrder = await this.orderRepository.updateOrderByOrderId(userId, orderId, updatedOrderData);
      return changedOrder;
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
