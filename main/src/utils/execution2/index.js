import { prisma } from '../prisma/index.js';
import { Prisma } from '@prisma/client';
import { sendNoticesToClient, sendNoticesToAllClients } from '../chartData/chartData.js';

// 전체 유저에게 전송
function sendToAllClient(notices) {
  sendNoticesToAllClients(notices);
}
// 개별 유저에게 전송
function sendToClient(userId, notices) {
  sendNoticesToClient(userId, notices);
}

async function execution(orderType, userId, companyId, orderId, type, quantity, price) {
  if (quantity <= 0) return;
  if (userId) userId = +userId;
  if (companyId) companyId = +companyId;
  if (orderId) orderId = +orderId;
  if (quantity) quantity = +quantity;
  if (price) price = +price;
  const initialQuantity = quantity;
  // console.log(orderType, userId, companyId, orderId, type, quantity, price);

  let notices = [];
  //기본적으로 주문이 완료되면 [userId:Int, companyId:Int, type:sell or buy, quantity:Int,price:Int ,executed:true] 형태로  notices에 추가
  //주문이 완료되지 않으면 [userId:Int, companyId:Int, type:sell or buy, quantity:Int, price:Int, executed:false] 형태로 notices에 추가
  //주문이 체결이 된다면 문자열로 `${nickname}님의 ${companyName}종목에 대한 ${quantity}주, ${price}원 ${type}주문이 체결되었습니다.`
  //주문이 체결이 안된다면 문자열로 `${nickname}님의 ${companyName}종목에 대한 ${quantity}주, ${price}원 ${type}주문이 체결되지 않았습니다.`
  const company = await prisma.company.findUnique({
    where: {
      companyId,
    },
  });
  try {
    await prisma.$transaction(
      async (tx) => {
        const messageQueue = [];
        //주문 생성/삭제 파트
        const user = await tx.user.findUnique({
          where: {
            userId,
          },
        });
        const stock = await tx.stock.findFirst({
          where: {
            userId,
            companyId,
          },
        });
        if (type === 'sell') {
          if (!stock) {
            throw new Error('보유 주식이 없습니다.');
          }
        }
        const orderQueue = [];
        if (orderType === 'update') {
          const Deletedata = {
            orderType: 'delete',
            userId,
            companyId,
            orderId,
            type,
            quantity,
            price,
          };
          orderQueue.push(Deletedata);
          const createdata = {
            orderType: 'create',
            userId,
            companyId,
            orderId,
            type,
            quantity,
            price,
          };
          orderQueue.push(createdata);
        } else {
          const data = {
            orderType,
            userId,
            companyId,
            orderId,
            type,
            quantity,
            price,
          };
          orderQueue.push(data);
        }
        for (const nowOrder of orderQueue) {
          // 주문 삭제 파트
          if (nowOrder.orderType === 'delete') {
            const deleteOrder = await tx.order.findUnique({
              where: {
                orderId: nowOrder.orderId,
              },
            });
            if (!deleteOrder) {
              throw new Error('존재하지 않는 주문입니다.');
            }
            await tx.order.delete({
              where: {
                orderId: deleteOrder.orderId,
              },
            });
            if (type === 'buy') {
              user.tradableMoney += BigInt(deleteOrder.price) * BigInt(deleteOrder.quantity);
            } else {
              stock.tradableQuantity += deleteOrder.quantity;
            }
            continue;
          }
          // 주문 생성 파트
          if (type === 'buy') {
            // 매수 주문 생성
            const totalQuantity = await tx.order.groupBy({
              where: {
                companyId: companyId,
                type: 'sell',
              },
              by: ['companyId'],
              _sum: {
                quantity: true,
              },
            });
            if (totalQuantity[0]._sum.quantity <= quantity) {
              throw new Error(`최대 ${totalQuantity[0]._sum.quantity - 1}주까지만 구매할 수 있습니다.`);
            }
            let priceOrders = {};
            if (price) {
              user.tradableMoney -= BigInt(price) * BigInt(quantity);
              priceOrders[price] = quantity;
            } else {
              const sellerOrders = await tx.order.findMany({
                where: {
                  companyId,
                  type: 'sell',
                },
                orderBy: [{ price: 'asc' }, { updatedAt: 'asc' }],
              });
              for (const order of sellerOrders) {
                if (order.quantity >= quantity) {
                  user.tradableMoney -= BigInt(order.price) * BigInt(quantity);
                  if (priceOrders[order.price]) priceOrders[order.price] += quantity;
                  else priceOrders[order.price] = quantity;
                  break;
                } else {
                  user.tradableMoney -= BigInt(order.price) * BigInt(order.quantity);
                  if (priceOrders[order.price]) priceOrders[order.price] += order.quantity;
                  else priceOrders[order.price] = order.quantity;
                  quantity -= order.quantity;
                }
              }
            }
            if (user.tradableMoney < 0) {
              throw new Error('에약 가능한 금액이 부족합니다.');
            }
            //priceOrder 객체를 순회
            let finalPrice = 0;
            for (const [nowPrice, nowQuantity] of Object.entries(priceOrders)) {
              finalPrice = Math.max(finalPrice, nowPrice);
            }
            await tx.order.create({
              data: {
                userId,
                companyId,
                type,
                price: finalPrice,
                quantity: initialQuantity,
              },
            });
          } else {
            // 매도 주문 생성
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
            if (totalQuantity[0]._sum.quantity <= quantity) {
              throw new Error(`최대 ${totalQuantity[0]._sum.quantity - 1}주까지만 판매할 수 있습니다.`);
            }
            if (!stock || stock.tradableQuantity < quantity) {
              throw new Error(`보유 주식이 부족합니다.`);
            }
            let priceOrders = {};
            if (price) {
              stock.tradableQuantity -= quantity;
              priceOrders[price] = quantity;
            } else {
              const buyerOrders = await tx.order.findMany({
                where: {
                  companyId,
                  type: 'buy',
                },
                orderBy: [{ price: 'desc' }, { updatedAt: 'asc' }],
              });
              for (const order of buyerOrders) {
                if (order.quantity >= quantity) {
                  stock.tradableQuantity -= quantity;
                  if (priceOrders[order.price]) priceOrders[order.price] += quantity;
                  else priceOrders[order.price] = quantity;
                  break;
                } else {
                  stock.tradableQuantity -= order.quantity;
                  if (priceOrders[order.price]) priceOrders[order.price] += order.quantity;
                  else priceOrders[order.price] = order.quantity;
                  quantity -= order.quantity;
                }
              }
            }
            //priceOrder 객체를 순회
            let finalPrice = 2000000000;
            for (const [nowPrice, nowQuantity] of Object.entries(priceOrders)) {
              finalPrice = Math.min(finalPrice, nowPrice);
            }
            await tx.order.create({
              data: {
                userId,
                companyId,
                type,
                price: finalPrice,
                quantity: initialQuantity,
              },
            });
          }
        }
        if (type === 'buy') {
          messageQueue.push({ orderType: 'tradableMoneyUpdate', userId: user.userId, tradableMoney: user.tradableMoney });
        } else {
          messageQueue.push({ orderType: 'tradableQuantityUpdate', stockId: stock.stockId, tradableQuantity: stock.tradableQuantity });
        }
        // 주문 매칭 파트
        const sellerOrders = await tx.order.findMany({
          where: {
            companyId,
            type: 'sell',
          },
          orderBy: [{ price: 'asc' }, { updatedAt: 'asc' }],
        });
        const buyerOrders = await tx.order.findMany({
          where: {
            companyId,
            type: 'buy',
          },
          orderBy: [{ price: 'desc' }, { updatedAt: 'asc' }],
        });
        if (type === 'buy') {
          // 매수 주문의 경우
          for (const buyerOrder of buyerOrders) {
            const buyer = await tx.user.findUnique({
              where: {
                userId: buyerOrder.userId,
              },
            });
            if (buyerOrder.price < sellerOrders[0].price) break;
            while (buyerOrder.quantity > 0 && buyerOrder.price >= sellerOrders[0].price) {
              const sellerOrder = sellerOrders[0];
              const seller = await tx.user.findUnique({
                where: {
                  userId: sellerOrder.userId,
                },
              });
              if (buyerOrder.quantity > sellerOrder.quantity) {
                notices.push(`${seller.nickname}님의 ${company.name} 종목에 대한 ${sellerOrder.quantity}주, ${sellerOrder.price}원 판매주문이 체결되었습니다.`);
                messageQueue.push({
                  orderType: 'execution',
                  executionType: 'complete',
                  order: sellerOrder,
                  quantity: sellerOrder.quantity,
                  price: sellerOrder.price,
                });
                sellerOrders.shift();
                notices.push(`${buyer.nickname}님의 ${company.name} 종목에 대한 ${sellerOrder.quantity}주, ${sellerOrder.price}원 구매주문이 체결되었습니다.`);
                messageQueue.push({
                  orderType: 'execution',
                  executionType: 'partial',
                  order: buyerOrder,
                  quantity: sellerOrder.quantity,
                  price: sellerOrder.price,
                });
                buyerOrder.quantity -= sellerOrder.quantity;
                continue;
              }
              if (buyerOrder.quantity === sellerOrder.quantity) {
                notices.push(`${seller.nickname}님의 ${company.name} 종목에 대한 ${buyerOrder.quantity}주, ${sellerOrder.price}원 판매주문이 체결되었습니다.`);
                messageQueue.push({
                  orderType: 'execution',
                  executionType: 'complete',
                  order: sellerOrder,
                  quantity: buyerOrder.quantity,
                  price: sellerOrder.price,
                });
                sellerOrders.shift();
              } else {
                notices.push(`${seller.nickname}님의 ${company.name} 종목에 대한 ${buyerOrder.quantity}주, ${sellerOrder.price}원 판매주문이 체결되었습니다.`);
                messageQueue.push({
                  orderType: 'execution',
                  executionType: 'partial',
                  order: sellerOrder,
                  quantity: buyerOrder.quantity,
                  price: sellerOrder.price,
                });
                sellerOrder.quantity -= buyerOrder.quantity;
              }
              notices.push(`${buyer.nickname}님의 ${company.name} 종목에 대한 ${buyerOrder.quantity}주, ${sellerOrder.price}원 구매주문이 체결되었습니다.`);
              messageQueue.push({
                orderType: 'execution',
                executionType: 'complete',
                order: buyerOrder,
                quantity: buyerOrder.quantity,
                price: sellerOrder.price,
              });
              buyerOrder.quantity = 0;
            }
          }
        } else {
          // 매도 주문의 경우
          for (const sellerOrder of sellerOrders) {
            if (sellerOrder.price > buyerOrders[0].price) break;
            const seller = await tx.user.findUnique({
              where: {
                userId: sellerOrder.userId,
              },
            });
            while (sellerOrder.quantity > 0 && sellerOrder.price <= buyerOrders[0].price) {
              const buyerOrder = buyerOrders[0];
              const buyer = await tx.user.findUnique({
                where: {
                  userId: buyerOrder.userId,
                },
              });
              if (sellerOrder.quantity > buyerOrder.quantity) {
                notices.push(`${buyer.nickname}님의 ${company.name} 종목에 대한 ${buyerOrder.quantity}주, ${buyerOrder.price}원 구매주문이 체결되었습니다.`);
                messageQueue.push({
                  orderType: 'execution',
                  executionType: 'complete',
                  order: buyerOrder,
                  quantity: buyerOrder.quantity,
                  price: buyerOrder.price,
                });
                buyerOrders.shift();
                notices.push(`${seller.nickname}님의 ${company.name} 종목에 대한 ${buyerOrder.quantity}주, ${buyerOrder.price}원 판매주문이 체결되었습니다.`);
                messageQueue.push({
                  orderType: 'execution',
                  executionType: 'partial',
                  order: sellerOrder,
                  quantity: buyerOrder.quantity,
                  price: buyerOrder.price,
                });
                sellerOrder.quantity -= buyerOrder.quantity;
                continue;
              }
              if (sellerOrder.quantity === buyerOrder.quantity) {
                notices.push(`${buyer.nickname}님의 ${company.name} 종목에 대한 ${sellerOrder.quantity}주, ${buyerOrder.price}원 구매주문이 체결되었습니다.`);
                messageQueue.push({
                  orderType: 'execution',
                  executionType: 'complete',
                  order: buyerOrder,
                  quantity: sellerOrder.quantity,
                  price: buyerOrder.price,
                });
                buyerOrders.shift();
              } else {
                notices.push(`${buyer.nickname}님의 ${company.name} 종목에 대한 ${sellerOrder.quantity}주, ${buyerOrder.price}원 구매주문이 체결되었습니다.`);
                messageQueue.push({
                  orderType: 'execution',
                  executionType: 'partial',
                  order: buyerOrder,
                  quantity: sellerOrder.quantity,
                  price: buyerOrder.price,
                });
                buyerOrder.quantity -= sellerOrder.quantity;
              }
              notices.push(`${seller.nickname}님의 ${company.name} 종목에 대한 ${sellerOrder.quantity}주, ${buyerOrder.price}원 판매주문이 체결되었습니다.`);
              messageQueue.push({
                orderType: 'execution',
                executionType: 'complete',
                order: sellerOrder,
                quantity: sellerOrder.quantity,
                price: buyerOrder.price,
              });
              sellerOrder.quantity = 0;
            }
          }
        }
        sendToAllClient(notices);
        // 주문 체결 결과 전송
        // messageQueue 배열을 queue처럼 사용하여 순차적으로 처리
        let companyCurrentPrice = company.currentPrice;
        while (messageQueue.length > 0) {
          const message = messageQueue.shift();
          if (message.orderType === 'tradableMoneyUpdate') {
            await tx.user.update({
              where: {
                userId: message.userId,
              },
              data: {
                tradableMoney: message.tradableMoney,
              },
            });
          } else if (message.orderType === 'tradableQuantityUpdate') {
            await tx.stock.update({
              where: {
                stockId: message.stockId,
              },
              data: {
                tradableQuantity: message.tradableQuantity,
              },
            });
          } else if (message.orderType === 'execution') {
            companyCurrentPrice = message.price;
            if (message.order.type === 'buy') {
              if (message.executionType === 'complete') {
                await tx.order.delete({
                  where: {
                    orderId: message.order.orderId,
                  },
                });
              } else {
                await tx.order.update({
                  where: {
                    orderId: message.order.orderId,
                  },
                  data: {
                    updatedAt: message.order.updatedAt,
                    quantity: {
                      decrement: message.quantity,
                    },
                  },
                });
              }
              await tx.concluded.create({
                data: {
                  userId: message.order.userId,
                  companyId: message.order.companyId,
                  type: message.order.type,
                  price: message.price,
                  quantity: message.quantity,
                },
              });
              await tx.user.update({
                where: {
                  userId: message.order.userId,
                },
                data: {
                  currentMoney: {
                    decrement: message.price * message.quantity,
                  },
                },
              });
              const stock = await tx.stock.findFirst({
                where: {
                  userId: message.order.userId,
                  companyId: message.order.companyId,
                },
              });
              if (stock) {
                await tx.stock.update({
                  where: {
                    stockId: stock.stockId,
                  },
                  data: {
                    quantity: {
                      increment: message.quantity,
                    },
                    tradableQuantity: {
                      increment: message.quantity,
                    },
                    averagePrice: (stock.averagePrice * stock.quantity + message.price * message.quantity) / (stock.quantity + message.quantity),
                  },
                });
              } else {
                await tx.stock.create({
                  data: {
                    userId: message.order.userId,
                    companyId: message.order.companyId,
                    quantity: message.quantity,
                    tradableQuantity: message.quantity,
                    averagePrice: message.price,
                  },
                });
              }
            } else {
              if (message.executionType === 'complete') {
                await tx.order.delete({
                  where: {
                    orderId: message.order.orderId,
                  },
                });
              } else {
                await tx.order.update({
                  where: {
                    orderId: message.order.orderId,
                  },
                  data: {
                    updatedAt: message.order.updatedAt,
                    quantity: {
                      decrement: message.quantity,
                    },
                  },
                });
              }
              await tx.concluded.create({
                data: {
                  userId: message.order.userId,
                  companyId: message.order.companyId,
                  type: message.order.type,
                  price: message.price,
                  quantity: message.quantity,
                },
              });
              await tx.user.update({
                where: {
                  userId: message.order.userId,
                },
                data: {
                  currentMoney: {
                    increment: message.price * message.quantity,
                  },
                  tradableMoney: {
                    increment: message.price * message.quantity,
                  },
                },
              });
              const stock = await tx.stock.findFirst({
                where: {
                  userId: message.order.userId,
                  companyId: message.order.companyId,
                },
              });
              if (stock.quantity === message.quantity) {
                await tx.stock.delete({
                  where: {
                    stockId: stock.stockId,
                  },
                });
              } else {
                await tx.stock.update({
                  where: {
                    stockId: stock.stockId,
                  },
                  data: {
                    quantity: {
                      decrement: message.quantity,
                    },
                    averagePrice: (stock.averagePrice * stock.quantity - message.price * message.quantity) / (stock.quantity - message.quantity),
                  },
                });
              }
            }
          }
        }
        if (company.currentPrice !== companyCurrentPrice) {
          await tx.company.update({
            where: {
              companyId: companyId,
            },
            data: {
              currentPrice: companyCurrentPrice,
            },
          });
        }
      },
      {
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      }
    );
    //여기서 notices 배열을 이용하여 채팅창으로 사용자들에게 체결 내역 전달
  } catch (err) {
    console.log(err.stack);
    sendToClient(userId, [`요청 실패: ${err.message}`]);
  }
}

export { execution };
