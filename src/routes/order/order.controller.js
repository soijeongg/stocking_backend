export class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  /**
   * 주문 조회 요청
   * @param {*} req X
   * @param {*} res data쫘르륵
   * @returns
   */
  getOrder = async (req, res) => {
    try {
      // let { userId } = res.locals.user;
      let userId = 1;
      const showOrder = await this.orderService.getOrder(userId);
      return res.json(showOrder);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  /**
   * 주문 생성 요청
   * @param {*} req body: data쫘르륵
   *                param: X
   * @param {*} res message하나 띡
   * @returns
   */
  postOrder = async (req, res) => {
    try {
      //let { userId } = res.locals.user;
      let userId = 1;
      const orderData = req.body;
      const createdOrder = await this.orderService.postOrder(orderData, userId);
      return res.json({ createdOrder });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  /**
   * 주문 정정 요청
   * @param {*} req body: data쪼끔
   *                param: X
   * @param {*} res 주문이 어떻게 정정되었는지.
   * @returns
   */
  updateOrder = async (req, res) => {
    try {
      //let { userId } = res.locals.user;
      let userId = 1;
      // const orderId = req.params.orderId;
      let orderId = 10;
      const changeData = req.body;
      const changedOrder = await this.orderService.updateOrder(userId, orderId, changeData);
      return res.json({ changedOrder });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };

  /**
   * 주문 삭제 요청
   * @param {*} req 없음
   * @param {*} res message하나 띡
   * @returns
   */
  deleteOrder = async (req, res) => {
    try {
      //let { userId } = res.locals.user;
      let userId = 1;
      // const OrderId = req.params.orderId;
      let orderId = 12;
      const deleteOrder = await this.orderService.deleteOrder(userId, orderId);
      return res.json({ deleteOrder });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };
}
