import { execution } from '../../utils/execution/index.js';

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
      const { userId } = res.locals.user;
      const { name, type, order, isSold } = req.query;
      const result = await this.orderService.getOrder(userId, name, type, order, isSold);
      return res.status(200).json(result);
    } catch (error) {
      console.log(error.stack);
      return res.status(400).json({ message: '주문 조회 도중 문제가 발생했습니다.' });
    }
  };
  // 사용자한테 보여줄때 어떤 데이터가 필요한지를 쿼리파라미터로 식별해서 다르게 보냄.
  // 정렬방식: 시간, 회사별, 매수/매도, 체결여부
  //  -> service 파트에서 추가

  //___________________________________________________________________________________________

  /**
   * 주문 생성 요청
   * @param {*} req: "companyId": 1, "type": "buy", or “sell”, "quantity": 10, "price": 32000,// price가 null이면 지정가,
   * @param {*} res: "orderId": 15, "updatedAt": "2024-03-27T16:04:36.149Z", "isSold": false, "userId": 1, "companyId": 1, "type": "buy", "timeToLive": "2024-03-28T15:42:28.338Z", "price": 32000, "quantity": 10
   * @returns
   */

  //int형으로 수정되어야하는 변수들: "companyId", "price", "quantity"
  postOrder = async (req, res) => {
    const { userId } = res.locals.user;
    const orderData = req.body;
    // 주문 데이터 유효성 확인- 나중에 joi로 바꿔야함--------------------------------controller단에서 가져온 데이터를 정수로(해당 데이터가 정수 데이터라면) 미리 바꿔서 전달
    // 1. 가격 확인 - 시장가/지정가 판별할때까지 보류.
    // 2. 회사id 확인
    let companyId = parseInt(orderData.companyId);
    if (companyId < 1 || !Number.isInteger(companyId)) {
      return res.status(400).json({ message: '잘못된 회사정보입니다.' });
    }

    // 3.type 확인
    let type = orderData.type;
    if (type != 'buy' && type != 'sell') {
      return res.status(400).json({ message: '잘못된 주문요청입니다. 매수/매도 주문만 가능합니다.' });
    }
    // 4. quantity 확인
    let quantity = parseInt(orderData.quantity);
    if (quantity < 1 || !Number.isInteger(quantity)) {
      return res.status(400).json({ message: '잘못된 주문수량입니다.' });
    }
    orderData.companyId = +orderData.companyId;
    orderData.quantity = +orderData.quantity;
    if (orderData.price) orderData.price = +orderData.price;

    try {
      await execution(userId, companyId, null, type, quantity, correctedPrice); // execution 함수 호출(시장가 주문일 경우 orderId는 null
      return res.json({ message: '주문이 성공적으로 생성되었습니다.' });
    } catch (error) {
      console.log(error.stack);
      return res.status(400).json({ message: '주문 생성 과정에서 에러가 발생했습니다.' });
    }
  };
  //___________________________________________________________________________________________
  /**
   * 주문 정정 요청
   * @param {*} req body: 정정data
   *                param: orderId
   * @param {*} res 성공/실패 메시지
   * @returns
   */
  updateOrder = async (req, res) => {
    try {
      const { userId } = res.locals.user;
      const originalOrderId = parseInt(req.query.orderId);
      const orderData = req.body;

      // 정정 주문 데이터 유효성 확인- 나중에 joi로 바꿔야함--------------------------------controller단에서 가져온 데이터를 정수로(해당 데이터가 정수 데이터라면) 미리 바꿔서 전달
      // 주문 정정은 지정가에만 가능 - 시장가는 이미 취소되거나 체결됐을테니
      // 1. 회사id 확인
      let companyId = parseInt(orderData.companyId);
      if (companyId < 1 || !Number.isInteger(companyId)) {
        return res.status(400).json({ message: '잘못된 회사정보입니다.' });
      }

      // 2.type 확인
      let type = orderData.type;
      if (type != 'buy' && type != 'sell') {
        return res.status(400).json({ message: '잘못된 주문요청입니다. 매수/매도 주문만 가능합니다.' });
      }
      // 3. quantity 확인
      let quantity = parseInt(orderData.quantity);
      if (quantity < 1 || !Number.isInteger(quantity)) {
        return res.status(400).json({ message: '잘못된 주문수량입니다.' });
      }
      // 4. 가격 확인
      let price = parseInt(orderData.price);
      if (price == null) {
        return res.status(400).json({ message: '지정가 주문만 가능합니다.' });
      }

      if (price < 10000) {
        // 만원이하면 안됨
        return res.status(400).json({ message: '잘못된 주문가격입니다.' });
      }
      const correctedPrice = 10000 * Math.floor(price / 10000); // 만의 배수가 되도록 price 내림
      orderData.companyId = +orderData.companyId;
      orderData.quantity = +orderData.quantity;
      orderData.price = +orderData.price;
      await execution(userId, companyId, originalOrderId, type, quantity, correctedPrice); // execution 함수 호출
      return res.json({ message: '주문 정정에 성공했습니다.\n 정정 내용:\n', changedOrder });
    } catch (error) {
      console.log(error.stack);
      return res.status(400).json({ message: '주문 정정 도중 문제가 발생했습니다.' });
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
      const { userId } = res.locals.user;
      const orderId = parseInt(req.query.orderId);
      const deleteOrder = await this.orderService.deleteOrder(userId, orderId);
      return res.json({ deleteOrder });
    } catch (error) {
      console.log(error.stack);
      return res.status(400).json({ message: '주문 삭제 도중 문제가 발생했습니다.' });
    }
  };
}
