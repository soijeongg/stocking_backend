import Redis from 'ioredis';
import { prisma } from '../prisma/index.js';
import { sendToExecutionServer } from '../sendToExecutionServer/index.js';
/**
 * @description 지정된 밀리초(ms) 동안 대기 후에 Promise를 해결(resolve)하여 비동기적 지연이 완료됨을 알려주는 함수
 * @param {number} ms - 함수가 지연될 시간을 밀리초 단위로 지정
 * @returns {Promise} 지정된 시간 동안 대기를 완료하면 Promise 객체를 반환
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * @description Redis 서버의 연결 상태가 'ready'가 될 때까지 지속적으로 확인
 * 준비 상태가 될 때까지 대기한다. 연결 준비가 되지 않은 경우 지정된 시간 간격(기본값 1000ms) 후에 재시도
 * 최대 5회 재시도한 후에도 연결이 준비되지 않으면 에러를 발생
 * @param {object} redis - Redis 클라이언트 인스턴스. 이 인스턴스의 상태 속성을 통해 연결 상태를 확인
 * @param {number} [timeout=1000] - 연결 재시도 간 대기 시간(ms 단위). 기본값은 1000ms
 * @throws {Error} 연결 재시도 횟수가 5회를 초과하면 연결 실패 에러를 발생시킴
 */
async function waitForRedisConnection(redis, timeout = 1000) {
  let attempt = 0;
  while (redis.status !== 'ready') {
    if (attempt > 0) {
      console.warn(`Waiting for Redis connection... Attempt ${attempt}`);
    }
    await sleep(timeout);
    attempt++;
    if (attempt >= 5) {
      // 재시도 횟수 제한
      throw new Error('Failed to connect to Redis after multiple attempts.');
    }
  }
}
//개발시 로컬에서 사용
// const redis = new Redis({
//   retryStrategy: (times) => Math.min(times * 50, 2000),
//   maxRetriesPerRequest: 10,
// });

//배포시 elasticache 주소로 변경
/**
 * @description Redis 클라이언트 인스턴스를 생성하고, 연결 상태에 따라 이벤트 핸들러를 설정
 * Redis 서버와의 연결, 에러 발생, 그리고 재연결 시도 시에 적절한 로그를 출력
 * @type {Redis} redis - Redis 클라이언트 객체.
 */
const redis = new Redis({
  host: `${process.env.MATCHING_REDIS_HOST}`, // Elasticache Redis 엔드포인트 주소
  port: `${process.env.MATCHING_REDIS_PORT}`, // 기본 Redis 포트
  retryStrategy: (times) => Math.min(times * 50, 2000), // 연결 재시도 전략
  maxRetriesPerRequest: 10, // 요청당 최대 재시도 횟수
});

// Redis 서버에 연결될 때 로그를 출력
redis.on('connect', () => {
  console.log('Redis client connected.');
});

// Redis 에러 발생 시 에러 정보를 로그로 출력
redis.on('error', (err) => {
  console.error('Redis error:', err);
});

// Redis 클라이언트가 재연결을 시도할 때 로그를 출력
redis.on('reconnecting', () => {
  console.log('Redis client reconnecting...');
});
/**
 * @description 새 게임 생성을 위해 사용자, 주문, 주식 데이터를 MySQl에서 조회하여 Redis에 저장하는 함수
 * string으로 회사, 주문 종류별 tatalQuantity와 최대 orderId, 최대 stockId, stock 서브 인덱스를 저장
 * hashset으로 user 정보, 주식 정보, 주문 정보를 저장
 * sorted set으로 회사, 주문 종류별 주문을 가중치를 부과하여 저장
 * @returns {Promise<void>} Redis에 데이터 저장 작업을 완료한 후 해결되는 Promise.
 * @throws {Error} 데이터베이스 조회나 Redis 명령 실행 중 오류가 발생할 경우 에러를 발생시킴
 */
async function createNewGame() {
  const users = await prisma.user.findMany({});
  const pipeline = redis.pipeline();
  for (let user of users) {
    pipeline.hset(`userId:${user.userId}`, 'tradableMoney', user.tradableMoney); //유저 정보 저장
  }
  const orders = await prisma.order.findMany({});
  pipeline.set('maxOrderId', orders[orders.length - 1].orderId); //최대 orderId 저장
  for (let order of orders) {
    pipeline.hmset(`orderId:${order.orderId}`, [
      'userId',
      order.userId,
      'companyId',
      order.companyId,
      'type',
      order.type,
      'updatedAt',
      order.updatedAt,
      'price',
      order.price,
      'quantity',
      order.quantity,
    ]); //주문 정보 저장
    const timeGap = order.updatedAt.getTime() - new Date('2024-01-01').getTime();
    const score = order.type === 'buy' ? -order.price + timeGap / 1e11 : order.price + timeGap / 1e11;
    pipeline.zadd(`orders:companyId:${order.companyId}:type:${order.type}`, score, order.orderId); //주문 가중치를 부여하여 sorted set에 저장
  }
  const totalQuantites = await prisma.order.groupBy({
    by: ['companyId', 'type'],
    _sum: {
      quantity: true,
    },
  });
  for (let totalQuantity of totalQuantites) {
    const companyId = totalQuantity.companyId;
    const type = totalQuantity.type;
    const quantity = totalQuantity._sum.quantity;
    pipeline.set(`totalQuantity:companyId:${companyId}:type:${type}`, quantity); // 회사별 주문 종류별 totalQuantity를 저장
  }
  const stocks = await prisma.stock.findMany({});
  pipeline.set('maxStockId', stocks[stocks.length - 1].stockId); //최대 stockId 저장
  for (let stock of stocks) {
    pipeline.hmset(`stockId:${stock.stockId}`, ['userId', stock.userId, 'companyId', stock.companyId, 'tradableQuantity', stock.tradableQuantity]); //주식 정보 저장
    pipeline.set(`stockIndex:userId:${stock.userId}:companyId:${stock.companyId}`, stock.stockId); //stock 서브 인덱스 저장
  }
  await pipeline.exec(); //Redis에 데이터 저장
}
/**
 * @description 주문 요청의 유효성을 검사하고 최종 가격을 계산하여 반환하는 함수
 * 주문 삭제가 아닌 경우, 매도 주문의 경우 가용 주식 수량이 충분한지, 매수 주문의 경우 가용 금액이 충분한지 검사
 * 주문이 유효하지 않은 경우, 사용자에게 메시지를 전송하고 함수를 종료합니다.
 * @param {Array} messageList - 사용자에게 전달될 메시지 목록.
 * @param {string} reqType - 요청 유형 ('orderCreate', 'orderDelete' 등).
 * @param {number} userId - 사용자 ID.
 * @param {number} companyId - 회사 ID.
 * @param {number} orderId - 주문 ID.
 * @param {string} type - 주문 유형 ('buy' 또는 'sell').
 * @param {number} quantity - 주문 수량.
 * @param {number} price - 주문 가격 (지정가 주문의 경우).
 * @returns {Promise<number>} 검사 후 결정된 최종 가격을 반환합니다. 이 값은 비동기적으로 계산
 * @throws {Error} 유효하지 않은 주문 조건에서 발생하는 오류 (예: 예약 가능한 주식수가 부족할 때, 필요 금액이 부족할 때).
 */
async function orderValidCheckAndReturnFinalPrice(messageList, reqType, userId, companyId, orderId, type, quantity, price) {
  if (reqType === 'orderDelete') return; // 주문 삭제 요청인 경우 함수 종료
  let nowQuantity, finalPrice, needMoney; // 현재 까지의 주문 수량, 최종 가격, 필요 금액
  const reverseType = type === 'buy' ? 'sell' : 'buy';
  const totalQuantity = await redis.get(`totalQuantity:companyId:${companyId}:type:${reverseType}`);
  if (totalQuantity <= quantity) {
    messageList.push({ reqType: 'messageToClient', userId: userId, message: `최대 ${totalQuantity - 1}개까지만 주문할 수 있습니다.` }); //최대 주문 수량 초과시 메시지 전송
    throw new Error(`최대 ${totalQuantity - 1}개까지만 주문할 수 있습니다.`);
  }
  // 매수 주문의 경우
  if (type === 'buy') {
    nowQuantity = 0;
    finalPrice = 0;
    needMoney = 0;
    if (!price) {
      // 시장가 주문인 경우
      const sellerOrderIds = await redis.zrange(`orders:companyId:${companyId}:type:sell`, 0, -1); // 판매자 주문 Id 리스트 조회
      for (let sellerOrderId of sellerOrderIds) {
        const sellerOrder = await redis.hgetall(`orderId:${sellerOrderId}`); // 판매자 주문 조회
        sellerOrder.price = +sellerOrder.price;
        sellerOrder.quantity = +sellerOrder.quantity;
        if (nowQuantity + sellerOrder.quantity < quantity) {
          //현재 주문 수량에 지금 확인하는 판매자 주문 수량을 더해도 목표 주문 수량보다 작은 경우
          nowQuantity += sellerOrder.quantity;
          needMoney += sellerOrder.price * sellerOrder.quantity;
          finalPrice = sellerOrder.price;
          continue;
        }
        // 지금 확인하는 판매자 주문을 처리하면 목표 주문 수량을 채울 수 있음
        needMoney += sellerOrder.price * (quantity - nowQuantity);
        nowQuantity = quantity;
        finalPrice = sellerOrder.price;
        break;
      }
    } else {
      // 지정가 주문인 경우
      nowQuantity = quantity;
      needMoney = price * quantity;
      finalPrice = price;
    }
    // 사용자의 거래 가능 금액 조회
    let tradableMoney = await redis.hget(`userId:${userId}`, 'tradableMoney');
    if (tradableMoney) tradableMoney = +tradableMoney;
    if (reqType === 'orderUpdate') {
      // 주문 정정의 경우 기존 주문을 삭제하면서 거래 가능 금액이 증가하는 것을 고려해야함
      const buyOrder = await redis.hgetall(`orderId:${orderId}`);
      buyOrder.price = +buyOrder.price;
      buyOrder.quantity = +buyOrder.quantity;
      tradableMoney += buyOrder.price * buyOrder.quantity;
    }
    if (tradableMoney < needMoney) {
      messageList.push({ reqType: 'messageToClient', userId: userId, message: '예약 가능한 금액이 부족합니다.' }); //가용 금액이 부족한 경우 메시지 전송
      throw new Error('예약가능한 금액이 부족합니다.');
    }
  }
  // 매도 주문의 경우
  if (type === 'sell') {
    nowQuantity = 0;
    finalPrice = 1e14;
    const stockId = await redis.get(`stockIndex:userId:${userId}:companyId:${companyId}`);
    let tradableQuantity = await redis.hget(`stockId:${stockId}`, 'tradableQuantity');
    if (!tradableQuantity) {
      messageList.push({ reqType: 'messageToClient', userId: userId, message: '예약 가능한 주식수가 부족합니다.' }); //가용 주식 수량이 부족한 경우 메시지 전송
      throw new Error('예약 가능한 주식수가 부족합니다.');
    }
    tradableQuantity = +tradableQuantity;
    if (reqType === 'orderUpdate') {
      // 주문 정정의 경우 기존 주문을 삭제하면서 거래 가능 주식 수량이 증가하는 것을 고려해야함
      const sellOrder = await redis.hgetall(`orderId:${orderId}`);
      sellOrder.quantity = +sellOrder.quantity;
      tradableQuantity += sellOrder.quantity;
    }
    if (tradableQuantity < quantity) {
      messageList.push({ reqType: 'messageToClient', userId: userId, message: '예약 가능한 주식수가 부족합니다.' }); //가용 주식 수량이 부족한 경우 메시지 전송
      throw new Error('예약 가능한 주식수가 부족합니다.');
    }
    if (!price) {
      // 시장가 주문인 경우
      const buyerOrderIds = await redis.zrange(`orders:companyId:${companyId}:type:buy`, 0, -1); // 구매자 주문 Id 리스트 조회
      for (let buyerOrderId of buyerOrderIds) {
        const buyerOrder = await redis.hgetall(`orderId:${buyerOrderId}`); // 구매자 주문 조회
        buyerOrder.price = +buyerOrder.price;
        buyerOrder.quantity = +buyerOrder.quantity;
        if (nowQuantity + buyerOrder.quantity <= quantity) {
          //현재 주문 수량에 지금 확인하는 구매자 주문 수량을 더해도 목표 주문 수량보다 작은 경우
          nowQuantity += buyerOrder.quantity;
          finalPrice = buyerOrder.price;
          continue;
        }
        // 지금 확인하는 구매자 주문을 처리하면 목표 주문 수량을 채울 수 있음
        nowQuantity = quantity;
        finalPrice = buyerOrder.price;
        break;
      }
    } else {
      // 지정가 주문인 경우
      nowQuantity = quantity;
      finalPrice = price;
    }
  }
  // 최종 가격을 반환
  finalPrice = +finalPrice;
  return finalPrice;
}
/**
 * @description 주어진 요청 유형(reqType)에 따라 주문 목록을 생성
 * 'orderCreate'는 주문을 생성하는 요청을 리스트에 추가
 * 'orderUpdate'는 기존 주문을 삭제하고 새로운 주문을 생성하는 요청을 리스트에 추가
 * 'orderDelete'는 주문을 삭제하는 요청을 리스트에 추가
 * @param {string} reqType - 요청 유형 ('orderCreate', 'orderUpdate', 'orderDelete').
 * @param {number} userId - 사용자 ID.
 * @param {number} companyId - 회사 ID.
 * @param {number} orderId - 주문 ID.
 * @param {string} type - 주문 유형 ('buy' 또는 'sell').
 * @param {number} quantity - 주문 수량.
 * @param {number} price - 주문 가격.
 * @returns {Array} 생성된 주문 목록을 반환
 */
async function makeOrderList(reqType, userId, companyId, orderId, type, quantity, price) {
  const orderList = [];
  switch (reqType) {
    case 'orderCreate':
      // 주문 생성 요청인 경우
      orderList.push({ reqType: 'create', orderId, userId, companyId, type, quantity, price });
      break;
    case 'orderUpdate':
      //  주문 정정 요청인 경우
      orderList.push({ reqType: 'delete', orderId, userId, companyId, type, quantity, price });
      orderList.push({ reqType: 'create', orderId, userId, companyId, type, quantity, price });
      break;
    case 'orderDelete':
      // 주문 삭제 요청인 경우
      orderList.push({ reqType: 'delete', orderId, userId, companyId, type, quantity, price });
      break;
  }
  return orderList;
}
/**
 * @description 주문을 삭제하고, 관련된 Redis 데이터를 업데이트
 * 존재하지 않는 주문에 대해서는 오류 메시지를 사용자에게 전송하고 에러를 발생
 * 주문 유형에 따라 다르게 처리되며, 'buy' 주문의 경우 거래 가능 금액을 증가
 * 'sell' 주문의 경우 거래 가능 주식 수를 증가
 * 또한, 해당 주문을 Redis에서 삭제하고, 가용 주식 및 가용 금액을 업데이트
 * 마지막으로 주문 삭제 메시지를 메시지 리스트에 추가
 * @param {Array} messageList - 사용자에게 전송될 메시지 목록.
 * @param {Object} order - 처리할 주문 객체. 이 객체는 orderId, userId, companyId, type 필드를 포함
 * @returns {Promise<void>} Redis 파이프라인의 실행을 완료한 후 해결되는 Promise.
 * @throws {Error} 주문이 존재하지 않을 때 발생하는 오류.
 */
async function processDeleteOrder(messageList, order) {
  // 주문 삭제
  const { orderId, userId, companyId, type } = order;
  let pipeline = redis.pipeline();
  const deleteOrder = await redis.hgetall(`orderId:${orderId}`); // 삭제할 주문 조회
  if (!deleteOrder) {
    messageList.push({ reqType: 'messageToClient', userId, message: '존재하지 않는 주문입니다.' }); //존재하지 않는 주문인 경우 메시지 전송
    throw new Error('존재하지 않는 주문입니다.');
  }
  deleteOrder.price = +deleteOrder.price;
  deleteOrder.quantity = +deleteOrder.quantity;
  pipeline.del(`orderId:${orderId}`);
  if (type === 'buy') {
    // 매수 주문의 경우
    pipeline.hincrby(`userId:${userId}`, 'tradableMoney', deleteOrder.price * deleteOrder.quantity);
    pipeline.zrem(`orders:companyId:${companyId}:type:buy`, orderId);
    pipeline.decrby(`totalQuantity:companyId:${companyId}:type:buy`, deleteOrder.quantity);
  } else {
    // 매도 주문의 경우
    const stockId = await redis.get(`stockIndex:userId:${userId}:companyId:${companyId}`);
    pipeline.hincrby(`stockId:${stockId}`, 'tradableQuantity', deleteOrder.quantity);
    pipeline.zrem(`orders:companyId:${companyId}:type:sell`, orderId);
    pipeline.decrby(`totalQuantity:companyId:${companyId}:type:sell`, deleteOrder.quantity);
  }
  await pipeline.exec();
  //메시지 리스트에 주문 삭제 정보 추가
  messageList.push({ reqType: 'orderDelete', orderId });
}
/**
 * @description 새 주문을 생성하고, Redis에 주문 관련 데이터를 업데이트
 * 주문 유형에 따라 점수를 계산하고, Redis에 주문을 추가하여 sortedset에 저장
 * Redis에서 주문 정보와 가용 주식 및 가용 수량 등을 업데이트합니다.
 * 마지막으로 생성된 주문의 세부 정보를 메시지 리스트에 추가합니다.
 * @param {Array} messageList - 사용자에게 전송될 메시지 목록.
 * @param {Object} order - 주문 정보를 담고 있는 객체. 이 객체는 userId, companyId, type, quantity 필드를 포함
 * @param {number} finalPrice - 최종 결정된 주문 가격.
 * @returns {Promise<void>} Redis 파이프라인의 실행을 완료하고, 메시지 리스트에 주문 생성 정보를 추가한 후 해결되는 Promise.
 * @throws {Error} Redis 명령 실행 중 오류가 발생할 경우 에러를 발생
 */
async function processCreateOrder(messageList, order, finalPrice) {
  // 주문 생성
  const { userId, companyId, type, quantity } = order;
  let pipeline = redis.pipeline();
  const newOrderId = await redis.incr('maxOrderId'); // 새 주문 ID 생성
  const nowTime = new Date();
  const timeGap = nowTime.getTime() - new Date('2024-01-01').getTime();
  finalPrice = +finalPrice;
  const score = type === 'buy' ? -finalPrice + timeGap / 1e11 : finalPrice + timeGap / 1e11; // 주문 가중치 계산
  pipeline.hmset(`orderId:${newOrderId}`, ['userId', userId, 'companyId', companyId, 'type', type, 'updatedAt', nowTime, 'price', finalPrice, 'quantity', quantity]); // 주문 정보 저장
  if (type === 'buy') {
    // 매수 주문의 경우
    pipeline.zadd(`orders:companyId:${companyId}:type:buy`, score, newOrderId);
    pipeline.incrby(`totalQuantity:companyId:${companyId}:type:buy`, quantity);
    pipeline.hincrby(`userId:${userId}`, 'tradableMoney', -finalPrice * quantity);
  } else {
    // 매도 주문의 경우
    const stockId = await redis.get(`stockIndex:userId:${userId}:companyId:${companyId}`);
    pipeline.zadd(`orders:companyId:${companyId}:type:sell`, score, newOrderId);
    pipeline.incrby(`totalQuantity:companyId:${companyId}:type:sell`, quantity);
    pipeline.hincrby(`stockId:${stockId}`, 'tradableQuantity', -quantity);
  }
  await pipeline.exec();
  const createdOrder = await redis.hgetall(`orderId:${newOrderId}`);
  createdOrder.price = +createdOrder.price;
  createdOrder.quantity = +createdOrder.quantity;
  // 메시지 리스트에 주문 생성 정보 추가
  messageList.push({
    reqType: 'orderCreate',
    orderId: newOrderId,
    userId: createdOrder.userId,
    companyId: createdOrder.companyId,
    type: createdOrder.type,
    updatedAt: createdOrder.updatedAt,
    price: createdOrder.price,
    quantity: createdOrder.quantity,
  });
}
/**
 * @description 주어진 회사 ID에 대해 가장 높은 가격, 먼저 생성된 구매자(buyer) 주문과 가장 낮은 가격, 먼저 생성된 판매자(seller) 주문을 찾아 반환
 * 먼저 Redis에서 각 주문 유형(buy/sell)에 해당하는 최상위 주문 ID를 가져오고 주문의 상세 정보 조회
 * 조회된 정보는 가격과 수량을 숫자형으로 변환하여 반환
 * @param {number} companyId - 조회할 회사의 ID.
 * @returns {Promise<Object>} 조회된 주문 정보 객체를 반환합니다. 이 객체는 구매자와 판매자의 주문 ID 및 상세 정보를 포함
 * @throws {Error} Redis 명령 실행 중 오류가 발생할 경우 에러를 발생시킵니다.
 */
async function findBuyerOrderAndSellerOrder(companyId) {
  // 매수자 주문 조회
  const buyerOrderId = await redis.zrange(`orders:companyId:${companyId}:type:buy`, 0, 0);
  const buyerOrder = await redis.hgetall(`orderId:${buyerOrderId[0]}`);
  buyerOrder.orderId = buyerOrderId[0];
  buyerOrder.price = +buyerOrder.price;
  buyerOrder.quantity = +buyerOrder.quantity;
  // 매도자 주문 조회
  const sellerOrderId = await redis.zrange(`orders:companyId:${companyId}:type:sell`, 0, 0);
  const sellerOrder = await redis.hgetall(`orderId:${sellerOrderId[0]}`);
  sellerOrder.orderId = sellerOrderId[0];
  sellerOrder.price = +sellerOrder.price;
  sellerOrder.quantity = +sellerOrder.quantity;
  return { buyerOrderId, buyerOrder, sellerOrderId, sellerOrder };
}
/**
 * @description 사용자의 거래 가능 금액 업데이트를 메시지 리스트에 추가
 * @param {Array} messageList - 사용자에게 전송될 메시지 목록을 담고 있는 배열.
 * @param {number} userId - 거래 가능 금액 업데이트 메시지를 받을 사용자의 ID.
 * @param {number} tradableMoney - 사용자의 업데이트된 거래 가능 금액.
 */
async function trablableMoneyUpdate(messageList, userId, tradableMoney) {
  // 메시지 리스트에 거래 가능 금액 업데이트 정보 추가
  messageList.push({ reqType: 'tradableMoneyUpdate', userId, tradableMoney: tradableMoney });
}
/**
 * @description 사용자의 특정 회사 주식에 대한 거래 가능 수량을 메시지 리스트에 추가
 * @param {Array} messageList - 사용자에게 전송될 메시지 목록을 담고 있는 배열.
 * @param {number} userId - 거래 가능 수량 업데이트 정보를 받을 사용자의 ID.
 * @param {number} companyId - 조회할 회사의 ID.
 */
async function tradableQuantityUpdate(messageList, userId, companyId) {
  const stockId = await redis.get(`stockIndex:userId:${userId}:companyId:${companyId}`);
  const tradableQuantity = await redis.hget(`stockId:${stockId}`, 'tradableQuantity');
  // 메시지 리스트에 거래 가능 수량 업데이트 정보 추가
  messageList.push({ reqType: 'tradableQuantityUpdate', userId, companyId, tradableQuantity });
}
/**
 * @description 구매자 주문과 판매자 주문을 매칭하고, 해당 주문들을 처리
 * 매칭 과정에서 체결 가격을 결정하고, 주문의 수량에 따라 완전 체결 또는 부분 체결을 실행
 * Redis를 사용하여 주문 관련 데이터의 업데이트를 처리후, 실행된 주문의 결과를 메시지 리스트에 추가
 * @param {Array} messageList - 사용자에게 전송될 메시지 목록을 담고 있는 배열.
 * @param {number} companyId - 매칭될 주문의 회사 ID.
 * @param {string} type - 주문 유형 ('buy' 또는 'sell'), 이 함수에서는 매칭 로직에 사용
 * @param {string} buyerOrderId - 구매자 주문의 ID.
 * @param {Object} buyerOrder - 구매자 주문의 상세 정보.
 * @param {string} sellerOrderId - 판매자 주문의 ID.
 * @param {Object} sellerOrder - 판매자 주문의 상세 정보.
 * @returns {Promise<void>} 모든 Redis 명령의 실행을 완료한 후 해결되는 Promise.
 * @throws {Error} Redis 명령 실행 중 오류가 발생할 경우 에러를 발생
 */
async function matchingOrderPair(messageList, companyId, type, buyerOrderId, buyerOrder, sellerOrderId, sellerOrder) {
  // 체결 가격 결정
  const executionPrice = type === 'buy' ? sellerOrder.price : buyerOrder.price;
  let pipeline = redis.pipeline();
  // 매도 주문 처리
  if (sellerOrder.quantity <= buyerOrder.quantity) {
    // 판매자 주문 수량이 구매자 주문 수량보다 작거나 같은 경우
    // 매도 주문은 완전 체결
    messageList.push({ reqType: 'execution', executionType: 'complete', order: sellerOrder, quantity: sellerOrder.quantity, price: executionPrice });
    pipeline.del(`orderId:${sellerOrderId[0]}`);
    pipeline.zrem(`orders:companyId:${companyId}:type:sell`, sellerOrderId[0]);
    pipeline.decrby(`totalQuantity:companyId:${companyId}:type:sell`, sellerOrder.quantity);
    pipeline.hincrby(`userId:${sellerOrder.userId}`, 'tradableMoney', executionPrice * sellerOrder.quantity);
  } else {
    // 핀메지 주문 수량이 구매자 주문 수량보다 많은 경우
    // 매도 주문은 부분 체결
    messageList.push({ reqType: 'execution', executionType: 'partial', order: sellerOrder, quantity: buyerOrder.quantity, price: executionPrice });
    pipeline.hincrby(`orderId:${sellerOrderId[0]}`, 'quantity', -buyerOrder.quantity);
    pipeline.decrby(`totalQuantity:companyId:${companyId}:type:sell`, buyerOrder.quantity);
    pipeline.hincrby(`userId:${sellerOrder.userId}`, 'tradableMoney', executionPrice * buyerOrder.quantity);
  }
  // 매수 주문 처리
  if (buyerOrder.price > executionPrice) {
    // 구매자 주문 가격이 체결 가격보다 높은 경우
    // 사용자 거래 가능 금액 업데이트
    pipeline.hincrby(`userId:${buyerOrder.userId}`, 'tradableMoney', (buyerOrder.price - executionPrice) * Math.min(+buyerOrder.quantity, +sellerOrder.quantity));
  }
  if (buyerOrder.quantity <= sellerOrder.quantity) {
    // 구매자 주문 수량이 판매자 주문 수량보다 작거나 같은 경우
    // 매수 주문은 완전 체결
    messageList.push({ reqType: 'execution', executionType: 'complete', order: buyerOrder, quantity: buyerOrder.quantity, price: executionPrice });
    pipeline.del(`orderId:${buyerOrderId[0]}`);
    pipeline.zrem(`orders:companyId:${companyId}:type:buy`, buyerOrderId[0]);
    pipeline.decrby(`totalQuantity:companyId:${companyId}:type:buy`, buyerOrder.quantity);
    const buyerStockId = await redis.get(`stockIndex:userId:${buyerOrder.userId}:companyId:${buyerOrder.companyId}`);
    if (buyerStockId) {
      // 사용자가 이미 해당 회사의 주식을 보유하고 있는 경우
      pipeline.hincrby(`stockId:${buyerStockId}`, 'tradableQuantity', buyerOrder.quantity);
    } else {
      // 사용자가 해당 회사의 주식을 보유하고 있지 않은 경우
      const newStockId = await redis.incr('maxStockId');
      await redis.set(`stockIndex:userId:${buyerOrder.userId}:companyId:${buyerOrder.companyId}`, newStockId);
      pipeline.hmset(`stockId:${newStockId}`, ['userId', buyerOrder.userId, 'companyId', buyerOrder.companyId, 'tradableQuantity', buyerOrder.quantity]);
    }
  } else {
    // 구매자 주문 수량이 판매자 주문 수량보다 많은 경우
    // 매수 주문은 부분 체결
    messageList.push({ reqType: 'execution', executionType: 'partial', order: buyerOrder, quantity: sellerOrder.quantity, price: executionPrice });
    pipeline.hincrby(`orderId:${buyerOrderId[0]}`, 'quantity', -sellerOrder.quantity);
    pipeline.decrby(`totalQuantity:companyId:${companyId}:type:buy`, sellerOrder.quantity);
    const buyerStockId = await redis.get(`stockIndex:userId:${buyerOrder.userId}:companyId:${buyerOrder.companyId}`);
    if (buyerStockId) {
      // 사용자가 이미 해당 회사의 주식을 보유하고 있는 경우
      pipeline.hincrby(`stockId:${buyerStockId}`, 'tradableQuantity', sellerOrder.quantity);
    } else {
      // 사용자가 해당 회사의 주식을 보유하고 있지 않은 경우
      const newStockId = await redis.incr('maxStockId');
      await redis.set(`stockIndex:userId:${buyerOrder.userId}:companyId:${buyerOrder.companyId}`, newStockId);
      pipeline.hmset(`stockId:${newStockId}`, ['userId', buyerOrder.userId, 'companyId', buyerOrder.companyId, 'tradableQuantity', sellerOrder.quantity]);
    }
  }
  await pipeline.exec();
}
/**
 * @description 주어진 메시지에 따라 다양한 주문 처리 작업을 수행
 * 이 함수는 Redis 서버와의 연결을 확인하고, 메시지를 분석하여 요청 유형에 따라 적절한 작업을 실행
 * 이후 체결서버에 보낼 메시지 리스트를 저장하고 체결 서버에 메시지를 전송
 * @param {string} message - 처리할 요청 정보가 담긴 JSON 문자열.
 * @returns {Promise<string>} 작업의 성공 또는 실패 ('success' 또는 'fail')를 반환
 * @throws {Error} 처리 중 발생하는 모든 오류를 캐치하고 관련 메시지를 출력합니다.
 */
async function matching(message) {
  const messageList = [];
  try {
    await waitForRedisConnection(redis);
    const orderData = JSON.parse(message);
    const reqType = orderData.reqType;
    switch (reqType) {
      // 게임 시작 파트
      case 'gameCreate': {
        await createNewGame();
        break;
      }
      //게임 종료 파트
      case 'gameDelete': {
        await redis.flushdb();
        break;
      }
      // 유저 회원가입 파트
      case 'userCreate': {
        const newUserId = orderData.userId;
        await redis.hmset(`userId:${newUserId}`, 'tradableMoney', 10000000);
        break;
      }
      // 주식 생성/정정/삭제 파트
      default:
        {
          if (!orderData.quantity || orderData.quantity <= 0) return;
          const numericFields = ['userId', 'companyId', 'orderId', 'quantity', 'price'];
          numericFields.forEach((field) => {
            if (orderData[field]) orderData[field] = +orderData[field]; //문자열을 숫자로 변환
          });
          let { userId, companyId, orderId, type, quantity, price } = orderData;
          // 주문 유효성 검증 및 최종 구매 금액 계산 함수 호출
          const finalPrice = await orderValidCheckAndReturnFinalPrice(messageList, userId, companyId, orderId, type, quantity, price);
          // 생성/정정/삭제 주문을 생성/삭제 주문으로 변경 후 orderList에 추가
          const orderList = await makeOrderList(orderData);
          // 생성/삭제 주문 처리 파트
          for (let order of orderList) {
            if (order.reqType === 'delete') {
              await processDeleteOrder(messageList, order); // 주문 삭제
            } else if (order.reqType === 'create') {
              await processCreateOrder(messageList, order, finalPrice); // 주문 생성
            }
          }
          // trablableMoney, tradableQuantity 업데이트 파트
          const initialTradableMoney = await redis.hget(`userId:${userId}`, 'tradableMoney');
          if (type === 'buy') {
            await trablableMoneyUpdate(messageList, userId, initialTradableMoney); // 가용 금액 업데이트
          } else {
            await tradableQuantityUpdate(messageList, userId, companyId); // 가용 주식 수량 업데이트
          }
          // 주문 매칭 파트
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { buyerOrderId, buyerOrder, sellerOrderId, sellerOrder } = await findBuyerOrderAndSellerOrder(companyId); // 매수자, 매도자 주문 조회
            if (buyerOrder.price < sellerOrder.price) {
              break; // 매수자 주문과 매도자 주문의 가격이 매칭되지 않으면 종료
            }
            await matchingOrderPair(messageList, companyId, type, buyerOrderId, buyerOrder, sellerOrderId, sellerOrder); // 매수자, 매도자 주문 매칭
          }
          const finalTradableMoney = await redis.hget(`userId:${userId}`, 'tradableMoney');
          if (type === 'buy' && initialTradableMoney !== finalTradableMoney) {
            await trablableMoneyUpdate(messageList, userId, finalTradableMoney); // 가용 금액 업데이트
          }
        }
        if (messageList.length > 0) {
          const executionMessage = JSON.stringify(messageList);
          sendToExecutionServer(executionMessage); //메시지 리스트에 있는 메시지를 체결 서버로 전송
        }
        return 'success';
    }
  } catch (err) {
    console.log(err.message);
    if (messageList.length > 0) {
      const executionMessage = JSON.stringify(messageList);
      sendToExecutionServer(executionMessage); //메시지 리스트에 있는 메시지를 체결 서버로 전송
    }
    return 'fail';
  }
}

export { matching };
