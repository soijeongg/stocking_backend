import { prisma } from '../prisma/index.js';
import { sendToMatchingServer } from '../sendToMatchingServer/index.js';
import { sendNoticesToAllClients } from '../socketConnecter/socketConnecter.js';
const events = [
  ['분식회계 적발로 신뢰도 급락!', -2.0, 0.4],
  ['최고경영자(C.E.O) 금융사기 혐의 조사 중!', -1.8, 0.5],
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
  ['신재생 에너지 사업 진출로 큰 수익 기대!', 1.7, 0.4],
  ['글로벌 대기업과의 대규모 파트너십 체결!', 1.8, 0.3],
  ['자율 주행 기술에서 중대한 진전 발표!', 1.9, 0.1],
  ['신 제품 출시로 기록적인 판매량 달성 예상!', 1.7, 0.4],
  ['유명 인물과의 협업으로 새로운 트렌드 창출!', 1.5, 0.2],
  ['신용등급 상향 조정으로 투자자들의 신뢰 획득!', 1.8, 0.2],
  ['직원 복지 정책이 인정받아 사회적 가치 인정받음!', 1.4, 0.5],
  ['정부로부터 대규모 연구 개발 자금을 지원받아!', 1.6, 0.1],
];
/**
 * @description 주어진 공지사항을 모든 연결된 클라이언트에게 전송
 * @param {string} notices - 공지사항은 문자열 형태
 */
function sendToAllClient(notices) {
  sendNoticesToAllClients(notices);
}

/**
 * @description 주어진 효과 값(`effectNum`)과 확률(`effectProb`)을 기반으로 하여 랜덤 숫자를 생성
 * 계산된 최대값(`max`)과 최소값(`min`)을 사용하여 랜덤 범위를 설정하며, `max`가 `min`보다 작은 경우 두 값을 교환
 * @param {number} effectNum - 랜덤 숫자 범위의 기준이 되는 값.
 * @param {number} effectProb - `effectNum`에 적용될 확률 계수. 이 값에 따라 최소값이 조정
 * @returns {number} 계산된 랜덤 숫자를 반환합니다.
 */
function getRandomNumber(effectNum, effectProb) {
  let max = effectNum;
  let min = -effectNum * effectProb;
  // max가 min보다 작으면 max와 min을 바꿔준다
  if (max < min) [max, min] = [min, max];
  return Math.random() * (max - min) + min;
}
/**
 * @description 주어진 값을 올림 처리하는 함수, 표준 `Math.ceil` 함수를 사용
 * 특수한 경우 (음수에서 -0.5로 끝날 경우)에는 올림된 결과에서 1을 빼서 반환
 * @param {number} value - 올림 처리할 숫자.
 * @returns {number} 조정된 올림 값. 음수이고 -0.5로 끝나는 경우 기본 올림 값에서 1을 뺀 값이 반환
 */
function customCeil(value) {
  if (value < 0 && value % 1 === -0.5) {
    return Math.ceil(value) - 1;
  } else {
    return Math.ceil(value);
  }
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
    const coefficent = getRandomNumber(event[1], event[2]); // 이벤트에 따른 계수 선정
    const quantity = customCeil(Math.random() * 10 * coefficent); // 계수 * 10* 랜덤 숫자를 올림 처리하여 주식 수량 결정
    // 랜덤 숫자 생성
    let random = Math.random();
    // 주문 뼈대 데이터 생성
    const jsonOrderData = {
      orderType: 'create',
      userId: dummyUser.userId,
      companyId: company.companyId,
      orderId: null,
    };
    if (random < 0.2) {
      // 시장가 주문 생성
      // 이벤트 공지
      sendToAllClient(`${company.name}, ${event[0]}`);
      //15초 대기
      await new Promise((resolve) => setTimeout(resolve, 15000));
      if (quantity == 0) return;
      else if (quantity < 0) {
        // 매도 주문 생성
        jsonOrderData.type = 'sell';
        jsonOrderData.quantity = -quantity;
        jsonOrderData.price = null;
        const jsonOrderDataString = JSON.stringify(jsonOrderData);
        sendToMatchingServer(jsonOrderDataString);
      } else {
        // 매수 주문 생성
        jsonOrderData.type = 'buy';
        jsonOrderData.quantity = quantity;
        jsonOrderData.price = null;
        const jsonOrderDataString = JSON.stringify(jsonOrderData);
        sendToMatchingServer(jsonOrderDataString);
      }
    } else if (random < 0.4) {
      // 지정가 주문 생성
      // 이벤트 공지
      sendToAllClient(`${company.name}, ${event[0]}`);
      //15초 대기
      await new Promise((resolve) => setTimeout(resolve, 15000));
      const constprice = Math.floor(Math.random() * 6);
      if (quantity == 0) return;
      else if (quantity < 0) {
        // 매도 주문 생성
        jsonOrderData.type = 'sell';
        jsonOrderData.quantity = -quantity;
        jsonOrderData.price = company.currentPrice + constprice * 10000;
        const jsonOrderDataString = JSON.stringify(jsonOrderData);
        sendToMatchingServer(jsonOrderDataString);
      } else {
        // 매수 주문 생성
        jsonOrderData.type = 'buy';
        jsonOrderData.quantity = quantity;
        jsonOrderData.price = company.currentPrice - constprice * 10000;
        const jsonOrderDataString = JSON.stringify(jsonOrderData);
        sendToMatchingServer(jsonOrderDataString);
      }
    } else {
      // 현재가 주변으로 주문이 비워지는 것을 방지하기 위해 현재가에 맞게 매도/매수 주문을 추가
      for (let i = -5; i < 0; ++i) {
        jsonOrderData.type = 'buy';
        jsonOrderData.quantity = Math.floor(Math.random() * 3);
        jsonOrderData.price = company.currentPrice + i * 10000;
        const jsonOrderDataString = JSON.stringify(jsonOrderData);
        sendToMatchingServer(jsonOrderDataString);
      }
      for (let i = 0; i <= 5; ++i) {
        jsonOrderData.type = 'sell';
        jsonOrderData.quantity = Math.floor(Math.random() * 3);
        jsonOrderData.price = company.currentPrice + i * 10000;
        const jsonOrderDataString = JSON.stringify(jsonOrderData);
        sendToMatchingServer(jsonOrderDataString);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

export { createDummyEvent };
