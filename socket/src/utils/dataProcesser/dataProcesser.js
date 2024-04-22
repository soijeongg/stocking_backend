import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from '../prisma/index.js';
import url from 'url';

let wss;
const clients = new Map();

function setupWebSocketServer(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // 1. 메인서버로부터 체결 데이터 수신
    // 프론트엔드 클라이언트 식별을 위해 userId와 WebSocket 인스턴스를 맵핑
    const requestUrl = new url.URL(req.url, `ws://${req.headers.host}`);
    const userId = parseInt(requestUrl.pathname.split('/')[3]);

    console.log('클라이언트 연결 URL:', req.url, '\nUserId:', userId);

    // 메시지 수신 시 처리
    ws.on('message', async function incoming(message) {
      const data = JSON.parse(message);
      console.log(data);
      // 백엔드 메인 서버로부터의 메시지 처리 (개인 메시지)
      if (data.type === 'personal' && data.userId) {
        // console.log('체결 메세지 수신:', data.userId, ' ', data.notices);
        // 개별 메시지 처리 - 체결 정보
        const targetWs = clients.get(data.userId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          // console.log(`클라이언트에 연결된 유저의 체결 정보입니다. 클라이언트에 갱신을 전송합니다.`);
          targetWs.send(JSON.stringify({ type: 'notices', notices: data.notices }));

          // 해당 userId에 연결된 companyId를 찾아 호가창 데이터를 갱신하고 전송
          // console.log(data);
          const companyId = parseInt(data.companyId);
          // console.log('체결된 주문의 companyId:', companyId);
        } else {
          // console.log(`클라이언트에 연결된 유저가 아닙니다.`);
        }
      } else if (data.type === 'broadcast') {
        // console.log('전체 메세지 수신:', data.notices);
        // 브로드캐스트 메시지 처리 - 호재/악재 발생 정보
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'notices', notices: data.notices }));
          }
        });
      }
    });
    //---------------------------------------------------------------------------------

    // 2. 클라이언트에 차트데이터와 호가 데이터 전송
    // URL에서 경로와 companyId 분석
    const path = req.url.split('/')[2];
    const companyId = parseInt(req.url.split('/')[3], 10);

    if (userId) {
      clients.set(userId, ws); // userId와 WebSocket 연결 객체 맵핑
    }
    // 프론트엔드 클라이언트로부터의 요청 처리
    if (path === 'chartData') {
      // 1초마다 차트 데이터 전송
      const chartDataInterval = setInterval(async () => {
        const chartData = await fetchAndSendChartData(companyId);
        // console.log('차트 데이터를 보냅니다:', chartData.currentPrice);
        ws.send(JSON.stringify({ type: 'chartData', data: chartData }));
      }, 1000);

      ws.on('close', () => {
        clearInterval(chartDataInterval);
        // console.log('차트 데이터 연결 종료:', companyId);
      });
    } else if (path === 'orderData') {
      // console.log('호가 데이터를 보내야합니다:', companyId);

      // 1초마다 호가 데이터 전송
      const orderDataInterval = setInterval(async () => {
        const orderData = await fetchAndSendOrderData(companyId);

        // console.log('호가 데이터를 보냅니다.', '현재가:', orderData.currentPrice);
        ws.send(JSON.stringify({ type: 'orderData', data: orderData }));
      }, 1000);

      ws.on('close', () => {
        clearInterval(orderDataInterval);
        // console.log('호가 데이터 연결 종료:', companyId);
      });
    }
  });
}

// 차트 데이터 조회 로직
async function fetchAndSendChartData(companyId) {
  const price = await prisma.company.findFirst({
    select: { currentPrice: true, initialPrice: true },
    where: { companyId: companyId },
  });
  return price;
}

// 호가 데이터 조회
async function fetchAndSendOrderData(companyId) {
  let priceResult = await prisma.company.findFirst({
    select: { currentPrice: true },
    where: { companyId: +companyId },
  });

  if (priceResult) {
    let currentPrice = priceResult.currentPrice;
    let groupedOrders = await prisma.order.groupBy({
      by: ['type', 'price'], // type과 price로 그룹화합니다.
      where: {
        companyId: +companyId,
        price: {
          gte: currentPrice - 50000, // 현재 가격 기준으로 -50000 이상
          lte: currentPrice + 50000, // 현재 가격 기준으로 +50000 이하
        },
      },
      _sum: {
        quantity: true, // 각 그룹의 quantity 합계를 계산합니다.
      },
      having: {
        quantity: {
          _sum: {
            gt: 0, // quantity 합계가 0보다 큰 그룹만 포함시킵니다.
          },
        },
      },
    });

    // 가격에 따라 정렬 (판매 주문은 오름차순, 구매 주문은 내림차순)
    groupedOrders.sort((a, b) => {
      if (a.price === b.price) {
        return a.type === 'sell' ? -1 : 1;
      }
      return b.price - a.price;
    });

    // 결과 전송
    return { groupedOrders, currentPrice };
  } else {
    // console.log('에러가 발생해 호가 데이터를 보내지 못했습니다.');
    return { groupedOrders: [], currentPrice: null };
  }
}

export default setupWebSocketServer;
