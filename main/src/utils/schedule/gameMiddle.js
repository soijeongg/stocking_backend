import { prisma } from '../prisma/index.js';
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://127.0.0.1:3000',
  withCredentials: true, // 모든 요청에 자동으로 쿠키를 포함시키도록 설정
});
function getRandomNumber(effectNum, effectProb) {
  let max = effectNum;
  let min = -effectNum * effectProb;
  //max가 min보다 작으면 max와 min을 바꿔준다
  if (max < min) [max, min] = [min, max];
  return Math.random() * (max - min) + min;
}

async function makeDummyOrder(content, effectNum, effectProb) {
  try {
    // 로그인 요청 보내기
    const loginResponse = await axiosInstance.post('/api/login', {
      email: 'dummy@naver.com',
      password: 'dummy',
    });

    // 'set-cookie' 헤더에서 쿠키 추출
    const setCookieHeader = loginResponse.headers['set-cookie'];
    if (setCookieHeader) {
      const cookie = setCookieHeader.map((cookie) => cookie.split(';')[0]).join('; ');
      // 쿠키를 포함하여 /api/userGet 요청 보내기
      const userGetAxiosInstance = axios.create({
        baseURL: 'http://127.0.0.1:3000',
        headers: { Cookie: cookie },
        withCredentials: true,
      });
      let companies = await prisma.company.findMany();
      let company = companies[Math.floor(Math.random() * companies.length)];
      let priceResult = await prisma.company.findFirst({
        select: { currentPrice: true },
        where: { companyId: +company.companyId },
      });

      if (priceResult) {
        let currentPrice = company.currentPrice;
        let groupedOrders = await prisma.order.groupBy({
          by: ['type', 'price'], // type과 price로 그룹화합니다.
          where: {
            companyId: company.companyId,
            price: currentPrice,
          },
          _sum: {
            quantity: true, // 각 그룹의 quantity 합계를 계산합니다.
          },
          having: {
            quantity: {
              _sum: {
                gt: 0, // quantity 합계가 0보다 큰 그룹만 포함시킵니다. 필요에 따라 이 조건을 조정할 수 있습니다.
              },
            },
          },
        });
        let orderquantity = getRandomNumber() * groupedOrders[0]._sum.quantity;
        orderquantity = Math.round(orderquantity);
        if (orderquantity < 0) {
          userGetAxiosInstance.post('/api/order', {
            companyId: priceResult.companyId,
            quantity: orderquantity,
            type: 'sell',
          });
        } else {
          userGetAxiosInstance.post('/api/order', {
            companyId: priceResult.companyId,
            quantity: orderquantity,
            type: 'buy',
          });
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

async function makeNews() {
  //0부터 1까지 랜덤으로된 숫자 생성
  let random = Math.random();
  let probability = 0.5;
  if (random < probability) return;
  let news = [
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
  //위의 항목들중 랜덤으로 한가지 뽑고
  let randomNews = news[Math.floor(Math.random() * news.length)];
  makeDummyOrder(randomNews[0], randomNews[1], randomNews[2]);
}
