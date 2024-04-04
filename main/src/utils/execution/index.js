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
        if (totalQuantity[0]._sum.quantity < quantity) {
          throw new Error(`최대 ${totalQuantity[0]._sum.quantity}주까지만 구매할 수 있습니다.`);
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
        const sellerOrders = await tx.order.findMany({
          where: {
            companyId,
            type: 'sell',
            price: {
              lte: price,
            },
          },
          orderBy: [
            {
              price: 'asc',
            },
            {
              updatedAt: 'asc',
            },
          ],
        });
        for (let sellerOrder of sellerOrders) {
          const sellerStock = await tx.stock.findFirst({
            where: {
              userId: sellerOrder.userId,
              companyId,
            },
          });
          if (!sellerStock || sellerStock.quantity < sellerOrder.quantity) {
            //주식이 부족하면 다음 주문으로 넘어감
            await tx.order.delete({
              where: {
                orderId: sellerOrder.orderId,
              },
            });
            continue;
          }
          const buyerStock = await tx.stock.findFirst({
            where: {
              userId,
              companyId,
            },
          });
          if (sellerOrder.quantity < quantity) {
            //판매주문량이 구매주문량보다 적을 때
            //결제되는 양: sellerOrder.quantity
            //결제되는 금액: sellerOrder.price
            // 주식 판매 처리
            await tx.order.delete({
              where: {
                orderId: sellerOrder.orderId,
              },
            });
            await tx.concluded.create({
              data: {
                userId: sellerOrder.userId,
                companyId,
                type: 'sell',
                price: sellerOrder.price,
                quantity: sellerOrder.quantity,
              },
            });
            await tx.user.update({
              where: {
                userId: sellerOrder.userId,
              },
              data: {
                currentMoney: {
                  increment: sellerOrder.price * sellerOrder.quantity,
                },
              },
            });
            if (sellerStock.quantity === sellerOrder.quantity) {
              await tx.stock.delete({
                where: {
                  stockId: sellerStock.stockId,
                },
              });
            } else {
              await tx.stock.update({
                where: {
                  stockId: sellerStock.stockId,
                },
                data: {
                  quantity: {
                    decrement: sellerOrder.quantity,
                  },
                  averagePrice: (sellerStock.averagePrice * sellerStock.quantity - sellerOrder.price * sellerOrder.quantity) / (sellerStock.quantity - sellerOrder.quantity),
                },
              });
            }
            //주식 구매 처리
            await tx.order.update({
              where: {
                orderId,
              },
              data: {
                quantity: {
                  decrement: sellerOrder.quantity,
                },
                updatedAt: buyerOrder.updatedAt,
              },
            });
            await tx.concluded.create({
              data: {
                userId,
                companyId,
                type: 'buy',
                price: sellerOrder.price,
                quantity: sellerOrder.quantity,
              },
            });
            buyer.currentMoney -= BigInt(sellerOrder.price) * BigInt(sellerOrder.quantity);
            if (buyer.currentMoney < 0) {
              throw new Error('가지고 있는 돈이 부족합니다.');
            }
            if (buyerStock) {
              await tx.stock.update({
                where: {
                  stockId: buyerStock.stockId,
                },
                data: {
                  quantity: {
                    increment: sellerOrder.quantity,
                  },
                  averagePrice: (buyerStock.averagePrice * buyerStock.quantity + sellerOrder.price * sellerOrder.quantity) / (buyerStock.quantity + sellerOrder.quantity),
                },
              });
            } else {
              await tx.stock.create({
                data: {
                  userId,
                  companyId,
                  quantity: sellerOrder.quantity,
                  averagePrice: sellerOrder.price,
                },
              });
            }
            quantity -= sellerOrder.quantity;
            continue;
          }
          //판매주문량이 구매주문량보다 많거나 같을 때
          //결제되는 양: quantity
          //결제되는 금액: sellerOrder.price
          // 주식 구매 처리
          await tx.order.delete({
            where: {
              orderId,
            },
          });
          await tx.concluded.create({
            data: {
              userId,
              companyId,
              type: 'buy',
              price: sellerOrder.price,
              quantity,
            },
          });
          buyer.currentMoney -= BigInt(sellerOrder.price) * BigInt(quantity);
          if (buyer.currentMoney < 0) {
            throw new Error('가지고 있는 돈이 부족합니다.');
          }
          if (buyerStock) {
            await tx.stock.update({
              where: {
                stockId: buyerStock.stockId,
              },
              data: {
                quantity: {
                  increment: quantity,
                },
                averagePrice: (buyerStock.averagePrice * buyerStock.quantity + sellerOrder.price * quantity) / (buyerStock.quantity + quantity),
              },
            });
          } else {
            await tx.stock.create({
              data: {
                userId,
                companyId,
                quantity,
                averagePrice: sellerOrder.price,
              },
            });
          }
          // 주식 판매 처리
          if (sellerOrder.quantity === quantity) {
            await tx.order.delete({
              where: {
                orderId: sellerOrder.orderId,
              },
            });
          } else {
            await tx.order.update({
              where: {
                orderId: sellerOrder.orderId,
              },
              data: {
                quantity: {
                  decrement: quantity,
                },
                updatedAt: sellerOrder.updatedAt,
              },
            });
          }
          await tx.concluded.create({
            data: {
              userId: sellerOrder.userId,
              companyId,
              type: 'sell',
              price: sellerOrder.price,
              quantity,
            },
          });
          await tx.user.update({
            where: {
              userId: sellerOrder.userId,
            },
            data: {
              currentMoney: {
                increment: sellerOrder.price * quantity,
              },
            },
          });
          if (sellerStock.quantity === quantity) {
            await tx.stock.delete({
              where: {
                stockId: sellerStock.stockId,
              },
            });
          } else {
            await tx.stock.update({
              where: {
                stockId: sellerStock.stockId,
              },
              data: {
                quantity: {
                  decrement: quantity,
                },
                averagePrice: (sellerStock.averagePrice * sellerStock.quantity - sellerOrder.price * quantity) / (sellerStock.quantity - quantity),
              },
            });
          }
          await tx.company.update({
            where: {
              companyId,
            },
            data: {
              currentPrice: sellerOrder.price,
            },
          });
          await tx.user.update({
            where: {
              userId,
            },
            data: {
              currentMoney: buyer.currentMoney,
            },
          });
          break;
        }
        return '요청한 주문이 완료되었습니다.';
        //종결
      } else {
        //매도 주문
        let sellerStock = await tx.stock.findFirst({
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
        if (totalQuantity[0]._sum.quantity < quantity) {
          throw new Error(`최대 ${totalQuantity[0]._sum.quantity}주까지만 판매할 수 있습니다.`);
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
        }
        //여기까지 판매 주문 생성 또는 수정 완료
        const buyerOrders = await tx.order.findMany({
          where: {
            companyId,
            type: 'buy',
            price: {
              gte: price,
            },
          },
          orderBy: [
            {
              price: 'desc', // 가격에 대해서는 내림차순 정렬
            },
            {
              updatedAt: 'asc', // 같은 가격을 가진 주문에 대해서는 업데이트 시간 순으로 오름차순 정렬
            },
          ],
        });
        for (let buyerOrder of buyerOrders) {
          const buyerUser = await tx.order.findFirst({
            where: {
              userId: buyerOrder.userId,
            },
          });
          if (buyerUser.currentMoney < buyerOrder.price * buyerOrder.quantity) {
            //돈이 부족하면 다음 주문으로 넘어감
            await tx.order.delete({
              where: {
                orderId: buyerOrder.orderId,
              },
            });
            continue;
          }
          const buyerStock = await tx.stock.findFirst({
            where: {
              userId: buyerOrder.userId,
              companyId,
            },
          });
          sellerStock = await tx.stock.findFirst({
            where: {
              userId,
              companyId,
            },
          });
          if (quantity > buyerOrder.quantity) {
            //판매주문량이 구매주문량보다 많을 때
            //결제되는 양: buyerOrder.quantity
            //결제되는 금액: buyerOrder.price
            // 주식 구매 처리
            await tx.order.delete({
              where: {
                orderId: buyerOrder.orderId,
              },
            });
            await tx.concluded.create({
              data: {
                userId: buyerOrder.userId,
                companyId,
                type: 'buy',
                price: buyerOrder.price,
                quantity: buyerOrder.quantity,
              },
            });
            await tx.user.update({
              where: {
                userId: buyerOrder.userId,
              },
              data: {
                currentMoney: {
                  decrement: buyerOrder.price * buyerOrder.quantity,
                },
              },
            });
            if (buyerStock) {
              await tx.stock.update({
                where: {
                  stockId: buyerStock.stockId,
                },
                data: {
                  quantity: {
                    increment: buyerOrder.quantity,
                  },
                  averagePrice: (buyerStock.averagePrice * buyerStock.quantity + buyerOrder.price * buyerOrder.quantity) / (buyerStock.quantity + buyerOrder.quantity),
                },
              });
            } else {
              await tx.stock.create({
                data: {
                  userId: buyerOrder.userId,
                  companyId,
                  quantity: buyerOrder.quantity,
                  averagePrice: buyerOrder.price,
                },
              });
            }
            //주식 판매 처리
            await tx.order.update({
              where: {
                orderId,
              },
              data: {
                quantity: {
                  decrement: buyerOrder.quantity,
                },
                updatedAt: sellerOrder.updatedAt,
              },
            });
            await tx.concluded.create({
              data: {
                userId,
                companyId,
                type: 'sell',
                price: buyerOrder.price,
                quantity: buyerOrder.quantity,
              },
            });
            await tx.user.update({
              where: {
                userId,
              },
              data: {
                currentMoney: {
                  increment: buyerOrder.price * buyerOrder.quantity,
                },
              },
            });
            await tx.stock.update({
              where: {
                stockId: sellerStock.stockId,
              },
              data: {
                quantity: {
                  decrement: buyerOrder.quantity,
                },
                averagePrice: (sellerStock.averagePrice * sellerStock.quantity - buyerOrder.price * buyerOrder.quantity) / (sellerStock.quantity - buyerOrder.quantity),
              },
            });
            quantity -= buyerOrder.quantity;
            continue;
          }
          //판매주문량이 구매주문량보다 적거나 같을 때
          // 결제되는 양: quantity
          // 결제되는 금액: buyerOrder.price
          // 주식 판매 처리
          await tx.order.delete({
            where: {
              orderId,
            },
          });
          await tx.concluded.create({
            data: {
              userId,
              companyId,
              type: 'sell',
              price: buyerOrder.price,
              quantity,
            },
          });
          await tx.user.update({
            where: {
              userId,
            },
            data: {
              currentMoney: {
                increment: buyerOrder.price * quantity,
              },
            },
          });
          if (quantity === sellerStock.quantity) {
            await tx.stock.delete({
              where: {
                stockId: sellerStock.stockId,
              },
            });
          } else {
            console.log(sellerStock.quantity, quantity);
            await tx.stock.update({
              where: {
                stockId: sellerStock.stockId,
              },
              data: {
                quantity: {
                  decrement: quantity,
                },
                averagePrice: (sellerStock.averagePrice * sellerStock.quantity - buyerOrder.price * quantity) / (sellerStock.quantity - quantity),
              },
            });
          }
          // 주식 구매 처리
          if (buyerOrder.quantity === quantity) {
            await tx.order.delete({
              where: {
                orderId: buyerOrder.orderId,
              },
            });
          } else {
            await tx.order.update({
              where: {
                orderId: buyerOrder.orderId,
              },
              data: {
                quantity: {
                  decrement: quantity,
                },
                updatedAt: buyerOrder.updatedAt,
              },
            });
          }
          await tx.concluded.create({
            data: {
              userId: buyerOrder.userId,
              companyId,
              type: 'buy',
              price: buyerOrder.price,
              quantity,
            },
          });
          await tx.user.update({
            where: {
              userId: buyerOrder.userId,
            },
            data: {
              currentMoney: {
                decrement: buyerOrder.price * quantity,
              },
            },
          });
          if (buyerStock) {
            await tx.stock.update({
              where: {
                stockId: buyerStock.stockId,
              },
              data: {
                quantity: {
                  increment: quantity,
                },
                averagePrice: (buyerStock.averagePrice * buyerStock.quantity + buyerOrder.price * quantity) / (buyerStock.quantity + quantity),
              },
            });
          } else {
            await tx.stock.create({
              data: {
                userId: buyerOrder.userId,
                companyId,
                quantity,
                averagePrice: buyerOrder.price,
              },
            });
          }
          await tx.company.update({
            where: {
              companyId,
            },
            data: {
              currentPrice: buyerOrder.price,
            },
          });
          break;
        }
        return '주문이 완료되었습니다.';
        //종결
      }
    });
  } catch (err) {
    throw err;
  }
}

export { execution };
