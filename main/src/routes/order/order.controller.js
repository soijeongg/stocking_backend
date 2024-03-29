function isValidDateFormat(str) {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  return pattern.test(str);
}
export class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }
  // test단계에서는 실제로 data가 존재하는지 확인 잘하셔야합니다. //
  // joi는 대충 만들어만 놓고 적용은 안했습니다. //
  // 나중에 로그인 구현되면 let {userId} = res.locals.user; 부분 주석해제, 아랫줄 삭제
  // 나중에 실제로 cur받아오게 되면 cur을 사용해야됨!
  // 잡다한 주석은 필수적인걸 제외하고 나중에 지우겠습니다.

  /**
   * 주문 조회 요청
   * @param {*} req params: 어떤 데이터가 필요한지.
   *                        기본 정렬:0, 시간별 정렬(오래된 순): 1, 시간별 정렬(최신순):2, 회사별 정렬(a부터): 3, 회사별 정렬(z부터): 4,
   *                        매수/ 매도(매수 먼저):5,매수/ 매도(매도 먼저):6, 체결여부(true먼저):7, 체결여부(false먼저):8
   * @param {*} res 조회된 data
   * @returns
   */

  getOrder = async (req, res) => {
    try {
      // let { userId } = res.locals.user;
      let userId = 1;
      const { name, type, order, isSold } = req.query;
      const result = await this.orderService.getOrder(userId, name, type, order, isSold);
      return res.status(200).json(result);
    } catch (error) {
      console.log(error.stack);
      return res.status(400).json({ error: error.message });
    }
  };
  // 사용자한테 보여줄때 어떤 데이터가 필요한지를 쿼리파라미터로 식별해서 다르게 보냄.
  // 정렬방식: 시간, 회사별, 매수/매도, 체결여부
  //  -> service 파트에서 추가

  /**
   * 주문 생성 요청
   * @param {*} req body: 생성data
   * @param {*} res 생성된 data
   * @returns
   */
  postOrder = async (req, res) => {
    try {
      //input 확인
      if (req.body.timeToLive == null) {
        req.body.timeToLive = new Date();
      } else {
        if (!isValidDateFormat(req.body.timeToLive)) {
          //에러처리
        }
        req.body.timeToLive = new Date(req.body.timeToLive);
      }
      //let { userId } = res.locals.user;
      let userId = 1;
      const orderData = req.body;
      const createdOrder = await this.orderService.postOrder(orderData, userId);
      return res.json({ createdOrder });
    } catch (error) {
      console.log(error.stack);
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
      const orderId = parseInt(req.query.orderId);
      console.log(orderId, typeof orderId);

      const orderData = req.body;
      const changedOrder = await this.orderService.updateOrder(userId, orderId, orderData);
      return res.json({ changedOrder });
    } catch (error) {
      console.log(error.stack);
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
      const orderId = parseInt(req.query.orderId);
      const deleteOrder = await this.orderService.deleteOrder(userId, orderId);
      return res.json({ deleteOrder });
    } catch (error) {
      console.log(error.stack);
      return res.status(400).json({ error: error.message });
    }
  };
}
