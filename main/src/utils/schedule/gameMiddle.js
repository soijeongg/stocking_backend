import { prisma } from '../prisma/index.js';
import { execution } from '../execution/index.js';
import { sendNoticesToAllClients } from '../chartData/chartData.js';

// 전체 유저에게 전송
function sendToAllClient(notices) {
  sendNoticesToAllClients(notices);
}

function getRandomNumber(effectNum, effectProb) {
  let max = effectNum;
  let min = -effectNum * effectProb;
  //max가 min보다 작으면 max와 min을 바꿔준다
  if (max < min) [max, min] = [min, max];
  return Math.random() * (max - min) + min;
}
function customCeil(value) {
  if (value < 0 && value % 1 === -0.5) {
    return Math.ceil(value) - 1;
  } else {
    return Math.ceil(value);
  }
}
async function createDummyEvent() {
  try {
    const dummyUser = await prisma.user.findFirst({
      where: {
        dummy: true,
      },
    });
    const companies = await prisma.company.findMany();
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
    let company = companies[Math.floor(Math.random() * companies.length)];
    console.log(company.name);
    const event = events[Math.floor(Math.random() * events.length)];
    const coefficent = getRandomNumber(event[1], event[2]);
    const quantity = customCeil(Math.random() * 5 * coefficent);
    console.log(quantity);
    //사건에 따라 정해진 확률로 quantity가 정해짐
    let random = Math.random();
    if (random < 0.2) {
      // 시장가 주문 생성
      console.log(event[0]);
      sendToAllClient(`${company.name}, ${event[0]}`); // 아마 이부분은 수정이 필요할듯..?
      //15초 대기
      await new Promise((resolve) => setTimeout(resolve, 15000));
      if (quantity == 0) return;
      else if (quantity < 0) await execution(dummyUser.userId, company.companyId, null, 'sell', -quantity, null);
      else await execution(dummyUser.userId, company.companyId, null, 'buy', quantity, null);
    } else if (random < 0.4) {
      // 지정가 주문 생성
      console.log(event[0]);
      sendToAllClient(`${company.name}, ${event[0]}`); // 아마 이부분은 수정이 필요할듯..?
      //15초 대기
      await new Promise((resolve) => setTimeout(resolve, 15000));
      const constprice = Math.floor(Math.random() * 6);
      if (quantity == 0) return;
      else if (quantity < 0) await execution(dummyUser.userId, company.companyId, null, 'sell', -quantity, company.currentPrice + constprice * 10000);
      else await execution(dummyUser.userId, company.companyId, null, 'buy', quantity, company.currentPrice - constprice * 10000);
    } else {
      // 사건과 관계없이 매도/매수 주문 모두 생성
      for (let i = -5; i < 0; ++i) {
        await execution(dummyUser.userId, company.companyId, null, 'buy', Math.floor(Math.random() * 3), company.currentPrice + i * 10000);
      }
      for (let i = 0; i <= 5; ++i) {
        await execution(dummyUser.userId, company.companyId, null, 'sell', Math.floor(Math.random() * 3), company.currentPrice + i * 10000);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

export { createDummyEvent };
