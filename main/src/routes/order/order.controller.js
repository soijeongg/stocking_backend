export class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }
  // test단계에서는 실제로 data가 존재하는지 확인 잘하셔야합니다. //
  // joi는 대충 만들어만 놓고 적용은 안했습니다. //
  // 거의 모든 에러 겪었으니 문의사항은 언제든지 환영 //

  /**
   * 주문 조회 요청
   * @param {*} req X
   * @param {*} res 조회된 data
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
   * @param {*} req body: 생성data
   * @param {*} res 생성된 data
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
   * @param {*} req body: 정정data
   *                param: orderId
   * @param {*} res 성공/실패 메시지
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
   * @param {*} req params: orderId
   * @param {*} res 성공/실패 메시지
   * @returns
   */
  deleteOrder = async (req, res) => {
    try {
      //let { userId } = res.locals.user;
      let userId = 1;
      // const OrderId = req.params.orderId;
      let orderId = 15; // 이거 삭제할때마다 확인해서 수정하셔야해요!
      const deleteOrder = await this.orderService.deleteOrder(userId, orderId);
      return res.json({ deleteOrder });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  };
}
