// 워낙 코드가 복잡해서 지속적인 테스트를 위해서 잡다한 console.log를 살려뒀습니다. //
// 어느정도 기간이 지나고 테스트가 끝나면 지우겠습니다. //
// 최대한 주석을 달아봤는데 추가로 달아주시면 매우 감사합니다. //

export class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  getOrder = async (userId, name, type, order, isSold) => {
    try {
      const filterData = await this.orderRepository.filterData(userId, name, type, order, isSold);
      return filterData;
    } catch (error) {
      // console.log(error.stack);
      return { message: '주문 조회 과정에서 에러가 발생했습니다.' };
    }
  };
  getOrderForUpdate = async (userId, orderId) => {
    try {
      const targetData = await this.orderRepository.findOrderByOrderId(userId, orderId);
      if (targetData == null) {
        return { message: '존재하지 않는 주문입니다.' };
      }
      return targetData;
    } catch (error) {
      console.error(error.stack);
      return { error: true, message: '주문 조회 과정에서 에러가 발생했습니다.' };
    }
  };
  deleteOrder = async (userId, orderId) => {
    try {
      const targetData = await this.orderRepository.findOrderByOrderId(userId, orderId);
      if (targetData == null) {
        return { message: '존재하지 않는 주문입니다.' };
      }
      // console.log(targetData);
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
