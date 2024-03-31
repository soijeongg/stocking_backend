// 워낙 코드가 복잡해서 지속적인 테스트를 위해서 잡다한 console.log를 살려뒀습니다. //
// 어느정도 기간이 지나고 테스트가 끝나면 지우겠습니다. //
// 최대한 주석을 달아봤는데 추가로 달아주시면 매우 감사합니다. //

export class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
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
  //주문 생성 요청
  postOrder = async (orderData, userId) => {
    const orderedValue = orderData.price * orderData.quantity;
    const companyId = orderData.companyId;
    const availableCash = await this.orderRepository.findAvailableCash(userId);
    const availableStock = await this.orderRepository.findStockQuantity(userId, companyId);
    // controller->service로 들어가자마자 사용자의 잔고를 판단, 부족하면 생성안하고 return
    if (orderData.type == 'buy' && availableCash <= orderedValue) {
      return { message: '잔고가 부족합니다.' };
    }
    if (orderData.type == 'sell' && availableStock <= orderData.quantity) {
      return { message: '보유주식이 부족합니다.' };
    }

    // 현재가와 매수/매도가 비교해서 isSold 판단& isSold:true는 유저의 계좌상황 변동                                            <*현재가* 관련 로직>
    // const currentPrice = this.cur;                                                                            실제 *현재가* 데이터 받아오면 이부분 변동 필요!!
    let currentPrice;
    //                                         항상 바로바로 체결되도록 *현재가* 로직 설정
    if (orderData.type == 'buy') {
      currentPrice = orderData.price + 1;
    } else if (orderData.type == 'sell') {
      currentPrice = orderData.price - 1;
    }

    if (orderData.price == null) {
      orderData.price = currentPrice;
    }

    let updatedOrderData = orderData;
    if (orderData.type == 'buy' && currentPrice <= orderData.price) {
      try {
        const stockDataWithBoolean = await this.orderRepository.isStockExisting(userId, orderData);
        const stockData = stockDataWithBoolean.stockData;
        const isStock = stockData ? stockDataWithBoolean.isStock : 0;
        const stockId = stockData ? stockData.stockId : 0;
        const currentAveragePrice = stockData ? stockData.averagePrice : 0;
        const currentQuantity = stockData ? stockData.quantity : 0;
        const changedAveragePrice = isStock ? (currentAveragePrice * currentQuantity + orderedValue) / (currentQuantity + orderData.quantity) : orderData.price;
        await this.orderRepository.concludeBuyoutOrder(userId, orderData, orderedValue, isStock, changedAveragePrice, stockId);
      } catch (error) {
        console.log(error.stack);
        return { error: true, message: '매수 주문에 대해 계좌에 접근하는 과정에서 문제가 발생했습니다.' };
      }
      updatedOrderData = { ...orderData, isSold: true };
    }
    if (orderData.type == 'sell' && currentPrice >= orderData.price) {
      try {
        const stockDataWithBoolean = await this.orderRepository.isStockExisting(userId, orderData);
        const stockData = stockDataWithBoolean.stockData;
        const stockId = stockData ? stockData.stockId : 0;
        if (stockData.quantity - orderData.quantity != 0) {
          await this.orderRepository.concludeSaleOrder(userId, orderData, orderedValue, stockId);
        } else {
          await this.orderRepository.concludeSaleOrderIfQuantityZero(userId, orderData, orderedValue, stockId);
        }
      } catch (error) {
        console.log(error.stack);
        return { error: true, message: '매도 주문에 대해 계좌에 접근하는 과정에서 문제가 발생했습니다.' };
      }
      updatedOrderData = { ...orderData, isSold: true };
    }
    try {
      const createdOrder = await this.orderRepository.postOrderByUserId(userId, updatedOrderData);
      return createdOrder;
    } catch (error) {
      console.log(error.stack);
      return { error: true, message: '해당 주문을 주문내역에 추가하지 못했습니다.' };
    }
  };
  // 생성 파트's service 파트
  // 1) controller->service로 들어가자마자 사용자의 잔고를 판단, 부족하면 생성안하고 return
  // 2) 현재가와 해당 주문을 대조해서
  //    if)    ‘매도가<=현재가 ,매수가>=현재가' 경우에 현재가로 주문을 체결시킴 --> order에 isSold: true 상태로 데이터 추가
  //    else) 그렇지 않을 경우에는 --> order테이블에 isSold: false 상태로 데이터를 추가
  //     -> 장중에만 활성화되도록 (클라이언트로부터 서버가 받은query파라미터로 판단).
  //
  //_______________________________________________________________________________________________________________________
  //
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
