import dotenv from 'dotenv';
import axios from 'axios';
import { prisma } from '../prisma/index.js';
import { cur } from './index.js';
dotenv.config();

const stockCode = [
  '000120',
  '003620',
  '373220',
  '035420',
  '302440',
  '000660',
  '001570',
  '000270',
  '003490',
  '028050',
  '005930',
  '041510',
  '086520',
  '455900',
  '035720',
  '259960',
  '352820',
  '128940',
  '012330',
  '004020',
];

const codeToName = {
  '000120': 'CJ대한통운',
  '003620': 'KG모빌리티',
  373220: 'LG에너지솔루션',
  '035420': 'NAVER',
  302440: 'SK바이오사이언스',
  '000660': 'SK하이닉스',
  '001570': '금양',
  '000270': '기아',
  '003490': '대한항공',
  '028050': '삼성엔지니어링',
  '005930': '삼성전자',
  '041510': '에스엠',
  '086520': '에코프로',
  455900: '엔젤로보틱스',
  '035720': '카카오',
  259960: '크래프톤',
  352820: '하이브',
  128940: '한미약품',
  '012330': '현대모비스',
  '004020': '현대제철',
};
/**
 *@description
 * 주식 가격이 변동될 때 주식을 매도/매수하는 함수입니다.
 * @param {string} companyName
 * @param {BigInteger} price
 */
async function updateCurrentPrice(companyName, price) {
  // 회사 이름으로 회사 정보를 조회합니다.
  const company = await prisma.company.findUnique({
    where: {
      name: companyName,
    },
  });
  // 회사 정보를 조회한 후, 해당 회사에 대한 주문을 조회합니다.
  const orderList = await prisma.order.findMany({
    where: {
      companyId: +company.companyId,
      isSold: false,
    },
  });
  for (const order of orderList) {
    if (order.type === 'sell' && order.price <= price) {
      //매도 주문일 경우
      // 트랜잭션을 이용하여 매도주문을 처리한다.
      try {
        await prisma.$transaction(
          async (tx) => {
            //1-1. 주문을 요청한 유저가 가지고 있는 주식 수를 구한다.
            const stock = await tx.stock.findFirst({
              where: {
                userId: +order.userId,
                companyId: +company.companyId,
              },
            });
            // 1-2. 주식이 없거나 주식 수량이 부족하다면 주문을 삭제하고 return한다.
            if (stock === null || stock.quantity < order.quantity) {
              await tx.order.delete({
                where: {
                  orderId: +order.orderId,
                },
              });
              return;
            }
            // 2-1. 유저가 가지고 있는 주식 수량을 감소시킨다.
            // 2-1-1. 유저가 가지고 있는 주식 수량이랑 판매 수량이 같다면 주식을 삭제한다.
            if (stock.quantity === order.quantity) {
              await tx.stock.delete({
                where: {
                  stockId: +stock.stockId,
                },
              });
            }
            // 2-1-2. 유저가 가지고 있는 주식 수량이 판매 수량보다 많다면 주식 수량만 감소시킨다.
            else {
              await tx.stock.update({
                where: {
                  stockId: +stock.stockId,
                },
                data: {
                  quantity: +stock.quantity - +order.quantity,
                },
              });
            }
            // 3. 주문을 처리한 유저의 잔고를 증가시킨다.
            await tx.user.update({
              where: {
                userId: +order.userId,
              },
              data: {
                currentMoney: {
                  increment: order.quantity * price,
                },
              },
            });
            // 4. 주문을 체결 처리
            await tx.order.update({
              where: {
                orderId: +order.orderId,
              },
              data: {
                isSold: true,
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        );
      } catch (err) {
        console.log(err);
      }
    } else if (order.type === 'buy' && order.price >= price) {
      // 매수 주문일 경우
      // 트랜잭션을 이용하여 매수주문을 처리한다.
      try {
        await prisma.$transaction(async (tx) => {
          // 1-1. 주문을 요청한 유저의 잔고를 구한다.
          const user = await tx.user.findUnique({
            where: {
              userId: +order.userId,
            },
          });
          // 1-2. 주문을 요청한 유저의 잔고가 부족하다면 에러를 발생시킨다.
          if (user.currentMoney < order.quantity * price) {
            await tx.order.delete({
              where: {
                orderId: +order.orderId,
              },
            });
            return;
          }
          // 2. 유저가 가지고 있는 현금 수량을 감소시킨다.
          await tx.user.update({
            where: {
              userId: +order.userId,
            },
            data: {
              currentMoney: {
                decrement: order.quantity * price,
              },
            },
          });
          //  3-1. 유저가 가지고 있는 주식을 조회한다.
          const stock = await tx.stock.findFirst({
            where: {
              userId: +order.userId,
              companyId: +company.companyId,
            },
          });
          // 3-1-1. 유저가 가지고 있는 주식이 없다면 주식을 생성한다.
          if (stock === null) {
            await tx.stock.create({
              data: {
                userId: +order.userId,
                companyId: +company.companyId,
                quantity: +order.quantity,
                averagePrice: +price,
              },
            });
          } else {
            // 3-1-2. 유저가 가지고 있는 주식이 있다면 수량과 평단가를 증가시킨다.
            const newQuantity = stock.quantity + order.quantity;
            const newAveragePrice = (stock.averagePrice * stock.quantity + order.quantity * price) / newQuantity;
            await tx.stock.update({
              where: {
                stockId: +stock.stockId,
              },
              data: {
                quantity: newQuantity,
                averagePrice: newAveragePrice,
              },
            });
          }
          //4. 주문을 처리한 유저의 주문을 체결 처리한다.
          await tx.order.update({
            where: {
              orderId: +order.orderId,
            },
            data: {
              isSold: true,
            },
          });
        });
      } catch (err) {
        console.log(err);
      }
    }
  }
}
/**
 * @description
 * 1. getAccessToken 함수를 호출하여 access_token을 받아옵니다.
 * 2. 해당 값은 환경 변수에 저장됩니다.
 */
async function getAccessToken() {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://openapi.koreainvestment.com:9443//oauth2/tokenP',
      data: {
        grant_type: 'client_credentials',
        appkey: process.env.appKey,
        appsecret: process.env.secretKey,
      },
    });
    process.env.ACCESS_TOKEN = response.data.access_token;
    console.log(process.env.ACCESS_TOKEN);
  } catch (err) {
    // 오류 처리
    console.log(err);
  }
}
/**
 * @description
 * getStockPrices 함수를 호출하여 주식 가격을 받아옵니다.
 * @param {Array} stockCodes 종목 코드 배열입니다.
 * @returns {Promise} Promise 객체를 반환합니다.
 */
async function getStockPrices(stockCodes) {
  const requests = stockCodes.map(async (code) => {
    try {
      const response = await axios.get('https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price', {
        headers: {
          authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          appkey: process.env.appKey,
          appsecret: process.env.secretKey,
          tr_id: 'FHKST01010100',
        },
        params: {
          fid_cond_mrkt_div_code: 'J',
          fid_input_iscd: `${code}`,
        },
      });

      //console.log(`Code: ${code}, Price: ${response.data.output.stck_prpr}`);
      // 여기서는 코드의 실행 흐름을 변경하지 않기 때문에 바로 비교하고 업데이트 할 수 있습니다.
      if (cur[codeToName[code]] !== response.data.output.stck_prpr) {
        // await updateCurrentPrice(codeToName[code], response.data.output.stck_prpr);
        console.log('주가변동 발생!', codeToName[code], cur[codeToName[code]], response.data.output.stck_prpr);
      }
      cur[codeToName[code]] = response.data.output.stck_prpr;
    } catch (err) {
      console.error(`Error fetching price for stock code ${code}:`, err.message);
    }
  });
  // 모든 프로미스가 완료될 때까지 기다립니다.
  await Promise.all(requests);
}

/**
 * @description
 * getApprovalKey 함수를 호출하여 웹소켓을 위한 approval_key를 받아옵니다.
 */
async function getApprovalKey() {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://openapi.koreainvestment.com:9443/oauth2/Approval',
      data: {
        grant_type: 'client_credentials',
        appkey: process.env.appKey,
        secretkey: process.env.secretKey,
      },
    });
    process.env.approval_key = response.data.approval_key;
    console.log(response.data.approval_key);

    // 요청이 성공적으로 완료되면 여기서 처리
  } catch (err) {
    // 오류 처리
  }
}

// 웹소켓 통신 관련 함수들- 현재는 미사용
/**
 * @deprecated
 * 웹소켓을 통해 주식 가격을 받아오는 함수입니다.
 * 현재는 사용하지 않습니다.
 * @param {Array} stockCodes
 *@returns {Promise} Promise 객체를 반환합니다.
 */
async function getStockPricesWebSocket(stockCodes) {
  const requests = stockCodes.map((code) => {
    return axios
      .get('https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-price', {
        headers: {
          authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          approval_key: process.env.approval_key,
          tr_id: 'FHKST01010100',
        },
        params: {
          fid_cond_mrkt_div_code: 'J',
          fid_input_iscd: `${code}`,
        },
      })
      .then((response) => {
        console.log(`Code: ${code}, Price: ${response.data.output.stck_prpr}`);
      })
      .catch((err) => {
        console.error(`Error fetching price for stock code ${code}:`, err.message);
      });
  });

  // 모든 요청이 완료될 때까지 기다립니다.
  await Promise.all(requests);
  console.log('모든 주식 가격 정보 요청이 완료되었습니다.');
}
/**
 * @description
 *웹소켓을 통해 주식의 현재가를 가격을 받아오는 함수입니다.
 * 현제 사용하지 않습니다.
 */
async function getStockInfoSocket() {
  while (process.env.approval_key === undefined) {
    await getApprovalKey();
    console.log(process.env.approval_key);
    setTimeout(() => {}, 6000);
  }
  getStockPricesWebSocket(stockCode);
}

export { getStockPrices, getAccessToken, stockCode };
