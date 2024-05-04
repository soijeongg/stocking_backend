import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from '../prisma/index.js';
import url from 'url';

let wss;
const clients = new Map();


/**
 * @description 웹소켓 서버 설정
 * 클라이언트와 연결 후 메시지 송수신, 차트/호가창 데이터 전송 처리
 * @param {*} server - HTTP 서버 객체. 이를 기반으로 웹소켓 서버가 설정
 */
function setupWebSocketServer(server) {
  wss = new WebSocketServer({ server });

  /**
   * @description 클라이언트와 연결 시 발생하는 이벤트
   * 메시지 처리, 차트/호가창 데이터 전송
   * @param {*} ws - 클라이언트와 연결된 웹소켓 인스턴스
   * @param {*} req 
   */
  wss.on('connection', (ws, req) => {
    const requestUrl = new url.URL(req.url, `ws://${req.headers.host}`);
    const userId = parseInt(requestUrl.pathname.split('/')[3]);

    // 클라이언트와 연결 시 userId와 WebSocket 인스턴스를 맵핑
    if (userId) {
      clients.set(userId, ws);
    }

    /**
     * @description 클라이언트로부터 메시지 수신 시 발생하는 이벤트
     * 개인 메시지, 브로드캐스트 메시지, 채팅 메시지 처리
     * @param {*} message - 클라이언트로부터 수신한 메시지
     * 메인서버로부터 받은 이벤트 메시지(개인, 브로드캐스트)는 notice타입으로 전송
     * 프론트엔드로부터 받은 채팅 메시지는 chat타입으로 전송
     */
    ws.on('message', async function incoming(message) {
      const data = JSON.parse(message);
      if (data.type === 'personal' && data.userId) {
        const targetWs = clients.get(data.userId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify({ type: 'notices', notices: data.notices }));
        }
      } else if (data.type === 'broadcast') {
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'notices', notices: data.notices }));
          }
        });
      } else {
        const userInfo = await prisma.user.findUnique({ where: { userId: data.userId } });
        const broadcastMessage = {
          type: 'chat',
          userId: data.userId,
          nickname: userInfo.nickname,
          text: data.text,
          timestamp: new Date().toLocaleTimeString(),
        };
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(broadcastMessage));
          }
        });
      }
    });

    const path = req.url.split('/')[2];
    const companyId = parseInt(req.url.split('/')[3], 10);

    // 차트 데이터 또는 호가 데이터 요청에 따라 데이터 전송
    if (path === 'chartData') {
      const chartDataInterval = setInterval(async () => {
        const chartData = await fetchAndSendChartData(companyId);
        ws.send(JSON.stringify({ type: 'chartData', data: chartData }));
      }, 1000);

      ws.on('close', () => clearInterval(chartDataInterval));
    } else if (path === 'orderData') {
      const orderDataInterval = setInterval(async () => {
        const orderData = await fetchAndSendOrderData(companyId);
        ws.send(JSON.stringify({ type: 'orderData', data: orderData }));
      }, 1000);

      ws.on('close', () => clearInterval(orderDataInterval));
    }
  });
}

/**
 * @description 주식 데이터 조회 로직
 * @param {*} companyId 
 * @returns 회사의 차트 데이터를 담은 객체
 */
async function fetchAndSendChartData(companyId) {
  return await prisma.company.findFirst({
    select: { currentPrice: true, initialPrice: true },
    where: { companyId: companyId },
  });
}

/**
 * @description 호가창 데이터 조회 로직
 * @param {*} companyId 
 * @returns 회사의 호가 데이터를 담은 객체
 */
async function fetchAndSendOrderData(companyId) {
  let priceResult = await prisma.company.findFirst({
    select: { currentPrice: true },
    where: { companyId: +companyId },
  });

  if (priceResult) {
    let currentPrice = priceResult.currentPrice;
    let groupedOrders = await prisma.order.groupBy({
      by: ['type', 'price'],
      where: {
        companyId: +companyId,
        price: { gte: currentPrice - 50000, lte: currentPrice + 50000 },
      },
      _sum: { quantity: true },
      having: { quantity: { _sum: { gt: 0 } } },
    });

    groupedOrders.sort((a, b) => b.price - a.price);

    return { groupedOrders, currentPrice };
  } else {
    return { groupedOrders: [], currentPrice: null };
  }
}

export default setupWebSocketServer;
