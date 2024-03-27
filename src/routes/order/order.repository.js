export class OrderRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  //주문 조회 요청
  findOrderByUserId = async (userId) => {
    return await this.prisma.order.findMany({
      where: {
        userId,
      },
    });
  };
  //주문 생성 요청
  postOrderByUserId = async (orderData, userId) => {
    return await this.prisma.order.create({
      data: {
        ...orderData,
        userId,
      },
    });
  };
  //주문 정정 요청
  updateOrderByOrderId = async (userId, orderId, changeData) => {
    return await this.prisma.order.update({
      where: {
        userId,
        orderId,
      },
      data: changeData,
    });
  };
  //주문 삭제 요청
  deleteOrderByOrderId = async (userId, orderId) => {
    return await this.prisma.order.delete({
      where: {
        userId,
        orderId,
      },
    });
  };
}
