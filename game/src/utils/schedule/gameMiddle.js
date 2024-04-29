import { prisma } from '../prisma/index.js';
import { sendToMatchingServer } from '../sendToMatchingServer/index.js';
import { sendNoticesToAllClients } from '../socketConnecter/socketConnecter.js';
const events = [
  ['분식회계 적발로 신뢰도 급락!', -2.0, 0.4],
  ['최고경영자(C.E.O) 금융사기 혐의 조사 중!', -1.8, 0.2],
  ['신제품 부작용 보고로 주가 하락!', -1.5, 0.4],
  ['대규모 제품 리콜로 인한 이미지 손상!', -1.5, 0.4],
  ['환경 규제 위반으로 거액의 벌금 부과!', -1.7, 0.2],
  ['주요 생산 시설에서 화재 사건 발생!', -1.4, 0.3],
  ['중대한 데이터 유출 사고로 인한 개인정보 침해!', -1.8, 0.4],
  ['해킹 공격으로 인한 대규모 서비스 중단!', -1.6, 0.3],
  ['안전 문제로 인한 제품 사용 금지 조치!', -1.7, 0.4],
  ['제품 내 유해물질 검출로 소비자 신뢰도 하락!', -1.5, 0.3],
  ['혁신적인 신제품 출시로 시장에서 주목 받음!', 1.8, 0.4],
  ['중요한 임상 시험에서 성공적인 결과 발표!', 1.9, 0.4],
  ['신재생 에너지 사업 진출로 큰 수익 기대!', 3.7, 0.4],
  ['글로벌 대기업과의 대규모 파트너십 체결!', 1.8, 0.3],
  ['자율 주행 기술에서 중대한 진전 발표!', 2.9, 0.1],
  ['신 제품 출시로 기록적인 판매량 달성 예상!', 3.7, 0.4],
  ['유명 인물과의 협업으로 새로운 트렌드 창출!', 2.5, 0.2],
  ['신용등급 상향 조정으로 투자자들의 신뢰 획득!', 1.8, 0.2],
  ['직원 복지 정책이 인정받아 사회적 가치 인정받음!', 1.4, 0.3],
  ['정부로부터 대규모 연구 개발 자금을 지원받아!', 2.6, 0.1],
];
/**
 * @description 주어진 공지사항을 모든 연결된 클라이언트에게 전송
 * @param {string} notices - 공지사항은 문자열 형태
 */
function sendToAllClient(notices) {
  sendNoticesToAllClients(notices);
}
/**
 * @description 주어진 두 수 사이에서 균등하게 분포된 랜덤 정수를 생성하고 반환하는 함수
 * @param {number} a - 범위의 하한값 또는 상한값.
 * @param {number} b - 범위의 하한값 또는 상한값.
 * @returns {number} a와 b 사이의 랜덤 정수.
 */
function getRandomIntInclusive(a, b) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Math.floor(Math.random() * (max - min + 1) + min);
}
/**
 * @description 더미 이벤트를 생성하고 이에 따른 주문을 생성하여 매칭 서버로 전송
 * 함수는 먼저 더미 사용자와 회사를 데이터베이스에서 조회한 다음, 정의된 이벤트 목록에서 무작위 이벤트를 선택
 * 이벤트에 따라 영향을 받는 회사의 주식에 대한 매수 또는 매도 주문을 생성
 * 이를 매칭 서버로 전송하기 전에 모든 클라이언트에게 해당 이벤트를 공지합
 * @returns {Promise<void>} 이벤트 및 주문 생성과 전송을 완료한 후 Promise를 반환
 * @throws {Error} 데이터베이스 조회 또는 주문 생성 중 발생하는 오류를 콘솔에 출력
 */
async function createDummyEvent() {
  try {
    // 더미 사용자 조회
    const dummyUser = await prisma.user.findFirst({
      where: {
        dummy: true,
      },
    });
    // 회사 조회
    const companies = await prisma.company.findMany(); //
    const company = companies[Math.floor(Math.random() * companies.length)]; // 랜덤으로 이벤트가 발생할 회사 선택
    const event = events[Math.floor(Math.random() * events.length)]; // 랜덤으로 이벤트 선택
    sendToAllClient(`${company.name}, ${event[0]}`);
    // 주문 뼈대 데이터 생성
    const jsonOrderData = {
      reqType: 'orderCreate',
      userId: dummyUser.userId,
      companyId: company.companyId,
      orderId: null,
    };
    for (let i = 0; i < 6; ++i) {
      let buyCoefficient, sellCoefficient;
      if (event[1] < 0) {
        buyCoefficient = getRandomIntInclusive(6, 9);
        sellCoefficient = getRandomIntInclusive(9, 15);
      } else {
        buyCoefficient = getRandomIntInclusive(9, 15);
        sellCoefficient = getRandomIntInclusive(6, 9);
      }
      let buyQuantity = Math.ceil(buyCoefficient * Math.random());
      let sellQuantity = Math.ceil(sellCoefficient * Math.random());
      let random = Math.random();
      if (event[1] < 0) {
        if (random < 0.3) {
          jsonOrderData.type = 'buy';
          jsonOrderData.quantity = buyQuantity;
        } else {
          jsonOrderData.type = 'sell';
          jsonOrderData.quantity = sellQuantity;
        }
      } else {
        if (random < 0.7) {
          jsonOrderData.type = 'buy';
          jsonOrderData.quantity = buyQuantity;
        } else {
          jsonOrderData.type = 'sell';
          jsonOrderData.quantity = sellQuantity;
        }
      }
      const jsonOrderDataString = JSON.stringify(jsonOrderData);
      sendToMatchingServer(jsonOrderDataString);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } catch (err) {
    console.error(err);
  }
}
/**
 * @description 모든 회사에 대해 더미 매수 및 매도 주문을 생성하는 함수
 * @returns {Promise<void>} 모든 더미 주문 생성 및 전송 작업을 완료한 후 Promise를 반환
 * @throws {Error} 데이터베이스 조회 또는 주문 전송 중 오류가 발생할 경우, 오류 메시지를 콘솔에 출력
 */
async function createDummyOrderToPreventEmptyOrderBook() {
  try {
    const dummyUser = await prisma.user.findFirst({
      where: {
        dummy: true,
      },
    });
    const jsonOrderData = {
      reqType: 'orderCreate',
      userId: dummyUser.userId,
      companyId: null,
      orderId: null,
    };
    const companies = await prisma.company.findMany();
    for (let company of companies) {
      let currentPrice = company.currentPrice;
      let groupedOrders = await prisma.order.groupBy({
        by: ['price'],
        where: {
          companyId: +company.companyId,
          price: { gte: currentPrice - 50000, lte: currentPrice + 50000 },
        },
        _count: true,
      });
      let companyInfo = {}; // companyInfo 객체를 초기화합니다.

      groupedOrders.forEach((order) => {
        companyInfo[order.price] = order._count;
      });
      // console.log('companyInfo:', companyInfo);
      for (let i = -5; i < 0; ++i) {
        let nowPrice = currentPrice + i * 10000;
        if (nowPrice <= 0) {
          continue;
        }
        if (companyInfo[nowPrice]) {
          continue;
        }
        // console.log('nowPrice:', nowPrice, 'type:', 'buy');

        jsonOrderData.companyId = company.companyId;
        jsonOrderData.type = 'buy';
        jsonOrderData.quantity = 10 + 2 * Math.floor(Math.random() * 5);
        jsonOrderData.price = company.currentPrice + i * 10000;
        const jsonOrderDataString = JSON.stringify(jsonOrderData);
        sendToMatchingServer(jsonOrderDataString);
      }
      for (let i = 1; i <= 5; ++i) {
        let nowPrice = currentPrice + i * 10000;
        if (companyInfo[nowPrice]) {
          continue;
        }
        // console.log('nowPrice:', nowPrice, 'type:', 'sell');

        jsonOrderData.companyId = company.companyId;
        jsonOrderData.type = 'sell';
        jsonOrderData.quantity = 10 + 2 * Math.floor(Math.random() * 5);
        jsonOrderData.price = company.currentPrice + i * 10000;
        const jsonOrderDataString = JSON.stringify(jsonOrderData);
        sendToMatchingServer(jsonOrderDataString);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

export { createDummyEvent, createDummyOrderToPreventEmptyOrderBook };
