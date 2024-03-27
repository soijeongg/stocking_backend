export class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }
  /**
   * 주문 조회 요청
   * @param {*} req a에서 받음
   * @param {*} res b에서 받음
   * @return service계층으로 보낼 order
   */
  getOrder = async (userId) => {
    const order = await this.orderRepository.findOrderByUserId(userId);
    return order;
  };

  //주문 생성 요청
  postOrder = async (orderData, userId) => {
    const createdOrder = await this.orderRepository.postOrderByUserId(orderData, userId);
    return createdOrder;
  };
  //주문 정정 요청
  updateOrder = async (userId, orderId, changeData) => {
    const changedOrder = await this.orderRepository.updateOrderByOrderId(userId, orderId, changeData);
    return changedOrder;
  };
  //주문 삭제 요청
  deleteOrder = async (userId, orderId) => {
    const deleteOrder = await this.orderRepository.deleteOrderByOrderId(userId, orderId);
    return deleteOrder;
  };
}
