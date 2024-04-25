import { prisma } from '../prisma/index.js';
import { Prisma } from '@prisma/client';
import { sendNoticesToClient, sendNoticesToAllClients } from '../socketConnecter/socketConnecter.js';

// 전체 유저에게 전송
function sendToAllClient(notices) {
  sendNoticesToAllClients(notices);
}
// 개별 유저에게 전송
function sendToClient(userId, notices) {
  sendNoticesToClient(userId, notices);
}

async function execution(message) {
  try {
    const messageQueue = JSON.parse(message);
    let notices = [];
    await prisma.$transaction(
      async (tx) => {
        let companyId = -1;
        let companyCurrentPrice = -1;
        while (messageQueue.length > 0) {
          const message = messageQueue.shift();
          // console.log('현재 처리중인 message', message);
          switch (message.reqType) {
            // 메시지 소켓 서버 전송 요청
            case 'messageToClient': {
              sendToClient(message.userId, message.message);
              break;
            }
            // 가용 금액을 업데이트 요청
            case 'tradableMoneyUpdate': {
              await tx.user.update({
                where: {
                  userId: message.userId,
                },
                data: {
                  tradableMoney: message.tradableMoney,
                },
              });
              break;
            }
            // 가용 주식 수량을 업데이트 요청
            case 'tradableQuantityUpdate': {
              const stock = await tx.stock.findFirst({
                where: {
                  userId: message.userId,
                  companyId: message.companyId,
                },
              });
              await tx.stock.update({
                where: {
                  stockId: stock.stockId,
                },
                data: {
                  tradableQuantity: +message.tradableQuantity,
                },
              });
              break;
            }
            // 주문 생성 요청
            case 'orderCreate': {
              message.updatedAt = new Date(message.updatedAt);
              message.updatedAt = message.updatedAt.toISOString();
              await tx.order.create({
                data: {
                  orderId: +message.orderId,
                  userId: +message.userId,
                  companyId: +message.companyId,
                  type: message.type,
                  updatedAt: message.updatedAt,
                  price: +message.price,
                  quantity: +message.quantity,
                },
              });
              break;
            }
            // 주문 삭제 요청
            case 'orderDelete': {
              await tx.order.delete({
                where: {
                  orderId: message.orderId,
                },
              });
              break;
            }
            // 주문 체결 처리 요청
            default: {
              //message.order의 strng 값을 number/Date로 변환
              message.order.companyId = +message.order.companyId;
              message.order.orderId = +message.order.orderId;
              message.order.updatedAt = new Date(message.order.updatedAt);
              message.order.updatedAt = message.order.updatedAt.toISOString();
              message.order.userId = +message.order.userId;
              message.order.price = +message.order.price;
              message.quantity = +message.quantity;
              message.price = +message.price;
              let userInfo;
              const orderType = message.order.type === 'buy' ? '매수' : '매도';
              if (companyId === -1) {
                // companyId 갱신
                companyId = message.order.companyId;
              }
              // companyCurrentPrice 갱신
              companyCurrentPrice = message.price;
              // company 정보 조회
              const company = await tx.company.findFirst({
                where: {
                  companyId: message.order.companyId,
                },
              });
              // 주문 체결 처리 파트
              // order => concluded => user => stock 순으로 업데이트
              if (message.order.type === 'buy') {
                // 매수 주문의 경우
                // Order 테이블 업데이트
                if (message.executionType === 'complete') {
                  // 완전체결인 경우
                  await tx.order.delete({
                    where: {
                      orderId: message.order.orderId,
                    },
                  });
                } else {
                  // 부분체결인 경우
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
                // Concluded 테이블 업데이트
                await tx.concluded.create({
                  data: {
                    userId: message.order.userId,
                    companyId: message.order.companyId,
                    type: message.order.type,
                    price: message.price,
                    quantity: message.quantity,
                  },
                });
                // User 테이블 업데이트
                userInfo = await tx.user.update({
                  where: {
                    userId: message.order.userId,
                  },
                  data: {
                    currentMoney: {
                      decrement: message.price * message.quantity,
                    },
                  },
                });
                // Stock 테이블 업데이트
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
                // 매도 주문의 경우
                // Order 테이블 업데이트
                if (message.executionType === 'complete') {
                  // 완전체결인 경우
                  await tx.order.delete({
                    where: {
                      orderId: message.order.orderId,
                    },
                  });
                } else {
                  // 부분체결인 경우
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
                // Concluded 테이블 업데이트
                await tx.concluded.create({
                  data: {
                    userId: message.order.userId,
                    companyId: message.order.companyId,
                    type: message.order.type,
                    price: message.price,
                    quantity: message.quantity,
                  },
                });
                // User 테이블 업데이트
                userInfo = await tx.user.update({
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
                // Stock 테이블 업데이트
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
                    },
                  });
                }
              }
              // 체결 처리 완료 후, 유저에게 알림 전송
              notices.push(`${userInfo.nickname}님의 ${company.name} 종목에 대한 ${message.quantity}주, ${message.price}원 ${orderType}주문이 체결되었습니다.`);
              break;
            }
          }
        }
        if (companyCurrentPrice !== -1 && companyId !== -1) {
          //companyId와 companyCurrentPrice가 갱신된 경우
          //company 테이블 업데이트
          await tx.company.update({
            where: {
              companyId: companyId,
            },
            data: {
              currentPrice: companyCurrentPrice,
            },
          });
        }
        if (notices.length > 0) {
          sendToAllClient(notices);
        }
      },
      {
        maxWait: 5000, // default: 2000
        timeout: 10000, // default: 5000
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      }
    );
  } catch (err) {
    console.log(err.message);
  }
}

export { execution };
