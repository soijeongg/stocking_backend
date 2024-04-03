import { prisma } from '../prisma/index.js';
import { Prisma } from '@prisma/client';

async function execution(userId, companyId, orderId, type, quantity, price) {
  try {
    await prisma.$transaction(async (tx) => {
      if (type === 'buy') {
        //매수 주문
        const buyer = await tx.user.findUnique({
          where: {
            userId,
          },
        });
        if (price && buyer.currentMoney < price * quantity) {
          throw new Error('가지고 있는 돈이 부족합니다.');
        }
        // 판매주문들을 모두 조회
        const totalQuantity = await tx.order.groupBy({
          where: {
            companyId: companyId,
            type: 'sell',
          },
          by: ['companyId'], // 또는 필요에 따라 다른 필드로 그룹화
          _sum: {
            quantity: true,
          },
        });
        if (totalQuantity[0].quantity < quantity) {
          throw new Error(`최대 ${totalQuantity[0].quantity}주까지만 구매할 수 있습니다.`);
        }
        if (!price) price = 1000000000; //시장가 주문
        let buyerOrder; //사용자 주문
        if (!orderId) {
          buyerOrder = await tx.order.create({
            data: {
              userId,
              companyId,
              type,
              quantity,
              price,
            },
          });
          orderId = buyerOrder.orderId;
        } else {
          buyerOrder = await tx.order.update({
            where: {
              orderId,
            },
            data: {
              userId,
              companyId,
              type,
              quantity,
              price,
            },
          });
        }
        //여기까지 구매 주문 생성 또는 수정 완료
      } else {
        //매도 주문
        const sellerStock = await tx.stock.findFirst({
          where: {
            userId,
            companyId,
          },
        });
        if (!sellerStock || sellerStock.quantity < quantity) {
          throw new Error('가지고 있는 주식이 부족합니다.');
        }
        // 구매주문들을 모두 조회
        const totalQuantity = await tx.order.groupBy({
          where: {
            companyId: companyId,
            type: 'buy',
          },
          by: ['companyId'], // 또는 필요에 따라 다른 필드로 그룹화
          _sum: {
            quantity: true,
          },
        });
        if (totalQuantity[0].quantity < quantity) {
          throw new Error(`최대 ${totalQuantity[0].quantity}주까지만 판매할 수 있습니다.`);
        }
        if (!price) price = 0; //시장가 주문
        let sellerOrder; //사용자 주문
        if (!orderId) {
          sellerOrder = await tx.order.create({
            data: {
              userId,
              companyId,
              type,
              quantity,
              price,
            },
          });
          orderId = sellerOrder.orderId;
        } else {
          sellerOrder = await tx.order.update({
            where: {
              orderId,
            },
            data: {
              userId,
              companyId,
              type,
              quantity,
              price,
            },
          });
          //여기까지 판매 주문 생성 또는 수정 완료
        }
      }
    });
  } catch (err) {
    throw err;
  }
}

export { execution };
