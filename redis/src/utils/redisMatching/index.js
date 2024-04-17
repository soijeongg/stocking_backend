import Redis from 'ioredis';
import { prisma } from '../prisma/index.js';
async function matching(message) {
  try {
    const redis = new Redis();
    const orderData = JSON.parse(message);
    const reqType = orderData.reqType;
    switch (reqType) {
      case 'gameCreate':
        const users = await prisma.user.findMany({});
        const pipeline = redis.pipeline();
        for (let user of users) {
          pipeline.hset(`userId:${user.userId}`, 'tradableMoney', user.tradableMoney);
        }
        const orders = await prisma.order.findMany({});
        pipeline.set('maxOrderId', orders[orders.length - 1].orderId);

        for (let order of orders) {
          pipeline.hset(`orderId:${order.orderId}`, [
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
          ]);
          const timeGap = order.updatedAt.getTime() - new Date('2024-01-01').getTime();
          const score = order.type === 'buy' ? -order.price + timeGap / 1e11 : order.price + timeGap / 1e11;
          pipeline.zadd(`orders:companyId:${order.companyId}:type:${order.type}`, score, order.orderId);
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
          pipeline.set(`totalQuantity:companyId:${companyId}:type:${type}`, quantity);
        }
        const stocks = await prisma.stock.findMany({});
        pipeline.set('maxStockId', stocks[stocks.length - 1].stockId);
        for (let stock of stocks) {
          pipeline.hset(`stockId:${stock.stockId}`, ['userId', stock.userId, 'companyId', stock.companyId, 'tradableQuantity', stock.tradableQuantity]);
          pipeline.set(`stockIndex:userId:${stock.userId}:companyId:${stock.companyId}`, stock.stockId);
        }
        await pipeline.exec();
        break;
      case 'gameDelete':
        await redis.flushdb();
        break;
      case 'userCreate':
        const newUserId = orderData.userId;
        await redis.hset(`userId:${newUserId}`, 'tradableMoney', 10000000);
        break;
      default:
        const { userId, companyId, orderId, type, quantity, price } = orderData;
        const orderList = [];
        const messageList = [];
        let nowQuantity, finalPrice, needMoney;
        // 주문 유효성 검증
        if (reqType !== 'orderDelete') {
          const reverseType = type === 'buy' ? 'sell' : 'buy';
          const totalQuantity = await redis.get(`totalQuantity:companyId:${companyId}:type:${reverseType}`);
          if (totalQuantity <= quantity) {
            messageList.push({ reqType: 'messageToClient', userId: userId, message: `최대 ${totalQuantity - 1}개까지만 주문할 수 있습니다.` });
            return;
          }
          if (type === 'buy') {
            nowQuantity = 0;
            finalPrice = 0;
            needMoney = 0;
            if (!price) {
              const sellerOrderIds = await redis.zrange(`orders:companyId:${companyId}:type:sell`, 0, -1);
              for (let sellerOrderId of sellerOrderIds) {
                const sellerOrder = await redis.hgetall(`orderId:${sellerOrderId}`);
                if (nowQuantity + sellerOrder.quantity >= quantity) {
                  nowQuantity += sellerOrder.quantity;
                  needMoney += sellerOrder.price * sellerOrder.quantity;
                  finalPrice = sellerOrder.price;
                  continue;
                }
                needMoney += sellerOrder.price * (quantity - nowQuantity);
                nowQuantity = quantity;
                finalPrice = sellerOrder.price;
                break;
              }
            } else {
              nowQuantity = quantity;
              needMoney = price * quantity;
              finalPrice = price;
            }
            let tradableMoney = await redis.hget(`userId:${userId}`, 'tradableMoney');
            if (reqType !== 'orderCreate') {
              buyOrder = await redis.hgetall(`orderId:${orderId}`);
              tradableMoney += buyOrder.price * buyOrder.quantity;
            }
            if (tradableMoney < needMoney) {
              messageList.push({ reqType: 'messageToClient', userId: userId, message: '예약가능한 금액이 부족합니다.' });
              return;
            }
          } else {
            nowQuantity = 0;
            finalPrice = 1e14;
            const stockId = await redis.get(`stockIndex:userId:${userId}:companyId:${companyId}`);
            const tradableQuantity = await redis.hget(`stockId:${stockId}`, 'tradableQuantity');
            if (!tradableQuantity || tradableQuantity < quantity) {
              messageList.push({ reqType: 'messageToClient', userId: userId, message: '예약 가능한 주식수가 부족합니다.' });
              return;
            }
            if (reqType !== 'orderCreate') {
              sellOrder = await redis.hgetall(`orderId:${orderId}`);
              tradableQuantity += sellOrder.quantity;
            }
            if (!price) {
              const buyerOrderIds = await redis.zrange(`orders:companyId:${companyId}:type:buy`, 0, -1);
              for (let buyerOrderId of buyerOrderIds) {
                const buyerOrder = await redis.hgetall(`orderId:${buyerOrderId}`);
                if (nowQuantity + buyerOrder.quantity <= quantity) {
                  nowQuantity += buyerOrder.quantity;
                  finalPrice = buyerOrder.price;
                  continue;
                }
                nowQuantity = quantity;
                finalPrice = buyerOrder.price;
              }
            } else {
              nowQuantity = quantity;
              finalPrice = price;
            }
          }
        }
        // 주문 생성/정정/삭제
        switch (reqType) {
          case 'orderCreate':
            orderList.push({ reqType: 'create', orderId, userId, companyId, type, quantity, price });
            break;
          case 'orderUpdate':
            orderList.push({ reqType: 'delete', orderId, userId, companyId, type, quantity, price });
            orderList.push({ reqType: 'create', orderId, userId, companyId, type, quantity, price });
            break;
          case 'orderDelete':
            orderList.push({ reqType: 'delete', orderId, userId, companyId, type, quantity, price });
            break;
        }
        for (let order of orderList) {
          const { reqType, orderId, userId, companyId, type, quantity, price } = order;
          if (reqType === 'delete') {
            let pipeline = redis.pipeline();
            const deleteOrder = await redis.hgetall(`orderId:${orderId}`);
            if (!deleteOrder) {
              messageList.push({ reqType: 'messageToClient', userId, message: '존재하지 않는 주문입니다.' });
              return;
            }
            pipeline.del(`orderId:${orderId}`);
            if (type === 'buy') {
              pipeline.hincrby(`userId:${userId}`, 'tradableMoney', deleteOrder.price * deleteOrder.quantity);
              pipeline.zrem(`orders:companyId:${companyId}:type:buy`, orderId);
              pipeline.decrby(`totalQuantity:companyId:${companyId}:type:buy`, deleteOrder.quantity);
            } else {
              const stockId = await redis.get(`stockIndex:userId:${userId}:companyId:${companyId}`);
              pipeline.hincrby(`stockId:${stockId}`, 'tradableQuantity', deleteOrder.quantity);
              pipeline.zrem(`orders:companyId:${companyId}:type:sell`, orderId);
              pipeline.decrby(`totalQuantity:companyId:${companyId}:type:sell`, deleteOrder.quantity);
            }
            await pipeline.exec();
            messageList.push({ reqType: 'orderDelete', orderId });
          } else {
            let pipeline = redis.pipeline();
            const newOrderId = await redis.incr('maxOrderId');
            const nowTime = new Date();
            const timeGap = nowTime.getTime() - new Date('2024-01-01').getTime();
            const score = type === 'buy' ? -price + timeGap / 1e11 : price + timeGap / 1e11;
            pipeline.hset(`orderId:${newOrderId}`, 'userId', userId, 'companyId', companyId, 'type', type, 'updatedAt', nowTime, 'price', price, 'quantity', quantity);
            if (type === 'buy') {
              pipeline.zadd(`orders:companyId:${companyId}:type:buy`, score, newOrderId);
              pipeline.incrby(`totalQuantity:companyId:${companyId}:type:buy`, quantity);
              pipeline.hincrby(`userId:${userId}`, 'tradableMoney', -needMoney);
            } else {
              const stockId = await redis.get(`stockIndex:userId:${userId}:companyId:${companyId}`);
              pipeline.zadd(`orders:companyId:${companyId}:type:sell`, score, newOrderId);
              pipeline.incrby(`totalQuantity:companyId:${companyId}:type:sell`, quantity);
              pipeline.hincrby(`stockId:${stockId}`, 'tradableQuantity', -quantity);
            }
            await pipeline.exec();
            const createdOrder = await redis.hgetall(`orderId:${newOrderId}`);
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
        }
        // trablableMoney, tradableQuantity 업데이트
        if (type === 'buy') {
          const tradableMoney = await redis.hget(`userId:${userId}`, 'tradableMoney');
          messageList.push({ reqType: 'tradableMoneyUpdate', userId, tradableMoney });
        } else {
          const stockId = await redis.get(`stockIndex:userId:${userId}:companyId:${companyId}`);
          const tradableQuantity = await redis.hget(`stockId:${stockId}`, 'tradableQuantity');
          messageList.push({ reqType: 'tradableQuantityUpdate', userId, companyId, tradableQuantity });
        }
        // 주문 매칭 파트
        while (true) {
          const buyerOrderId = await redis.zrange(`orders:companyId:${companyId}:type:buy`, 0, 0);
          const sellerOrderId = await redis.zrange(`orders:companyId:${companyId}:type:sell`, 0, 0);
          const buyerOrder = await redis.hgetall(`orderId:${buyerOrderId[0]}`);
          const sellerOrder = await redis.hgetall(`orderId:${sellerOrderId[0]}`);
          if (buyerOrder.price < sellerOrder.price) {
            break;
          }
          const executionPrice = type === 'buy' ? sellerOrder.price : buyerOrder.price;
          let pipeline = redis.pipeline();
          if (sellerOrder.quantity <= buyerOrder.quantity) {
            messageList.push({ reqType: 'execution', excutionType: 'complete', order: sellerOrder, quantity: sellerOrder.quantity, price: executionPrice });
            pipeline.del(`orderId:${sellerOrderId[0]}`);
            pipeline.zrem(`orders:companyId:${companyId}:type:sell`, sellerOrderId[0]);
            pipeline.decrby(`totalQuantity:companyId:${companyId}:type:sell`, sellerOrder.quantity);
            pipeline.hincrby(`userId:${sellerOrder.userId}`, 'tradableMoney', executionPrice * sellerOrder.quantity);
          } else {
            messageList.push({ reqType: 'execution', excutionType: 'partial', order: sellerOrder, quantity: buyerOrder.quantity, price: executionPrice });
            pipeline.hincrby(`orderId:${sellerOrderId[0]}`, 'quantity', -buyerOrder.quantity);
            pipeline.decrby(`totalQuantity:companyId:${companyId}:type:sell`, buyerOrder.quantity);
            pipeline.hincrby(`userId:${sellerOrder.userId}`, 'tradableMoney', executionPrice * buyerOrder.quantity);
          }
          if (buyerOrder.quantity <= sellerOrder.quantity) {
            messageList.push({ reqType: 'execution', excutionType: 'complete', order: buyerOrder, quantity: buyerOrder.quantity, price: executionPrice });
            pipeline.del(`orderId:${buyerOrderId[0]}`);
            pipeline.zrem(`orders:companyId:${companyId}:type:buy`, buyerOrderId[0]);
            pipeline.decrby(`totalQuantity:companyId:${companyId}:type:buy`, buyerOrder.quantity);
            const buyerStockId = await redis.get(`stockIndex:userId:${buyerOrder.userId}:companyId:${buyerOrder.companyId}`);
            if (buyerStockId) {
              pipeline.hincrby(`stockId:${buyerStockId}`, 'tradableQuantity', buyerOrder.quantity);
            } else {
              const newStockId = await redis.incr('maxStockId');
              await redis.set(`stockIndex:userId:${buyerOrder.userId}:companyId:${buyerOrder.companyId}`, newStockId);
              pipeline.hset(`stockId:${newStockId}`, ['userId', buyerOrder.userId, 'companyId', buyerOrder.companyId, 'tradableQuantity', buyerOrder.quantity]);
            }
          } else {
            messageList.push({ reqType: 'execution', excutionType: 'partial', order: buyerOrder, quantity: sellerOrder.quantity, price: executionPrice });
            pipeline.hincrby(`orderId:${buyerOrderId[0]}`, 'quantity', -sellerOrder.quantity);
            pipeline.decrby(`totalQuantity:companyId:${companyId}:type:buy`, sellerOrder.quantity);
            const buyerStockId = await redis.get(`stockIndex:userId:${buyerOrder.userId}:companyId:${buyerOrder.companyId}`);
            if (buyerStockId) {
              pipeline.hincrby(`stockId:${buyerStockId}`, 'tradableQuantity', sellerOrder.quantity);
            } else {
              const newStockId = await redis.incr('maxStockId');
              await redis.set(`stockIndex:userId:${buyerOrder.userId}:companyId:${buyerOrder.companyId}`, newStockId);
              pipeline.hset(`stockId:${newStockId}`, 'userId', buyerOrder.userId, 'companyId', buyerOrder.companyId, 'tradableQuantity', sellerOrder.quantity);
            }
          }
          await pipeline.exec();
        }
    }
  } catch (err) {
    console.error(err);
  }
}

export { matching };
