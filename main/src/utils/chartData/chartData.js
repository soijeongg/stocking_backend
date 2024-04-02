import { WebSocketServer } from 'ws';
import url from 'url';
import { prisma } from '../prisma/index.js';
export function setupWebSocketServer(port) {
  const wss = new WebSocketServer({ port });

  wss.on('connection', function connection(ws, req) {
    const requestUrl = new URL(req.url, `http://localhost:8080`); // 기본 URL을 제공해야 합니다.
    const companyId = Number(requestUrl.searchParams.get('companyId'));
    console.log('클라이언트가 연결되었습니다.');

    const getCurrentPrice = async () => {
      let price = await prisma.company.findFirst({
        select: { currentPrice: true, initialPrice: true },
        where: { companyId: companyId },
      });
      ws.send(JSON.stringify(price));
      console.log(`가격 정보 전송: ${JSON.stringify(price)}`);
    };
    // 1초마다 가격 정보 전송
    const intervalId = setInterval(getCurrentPrice, 1000);
    // 클라이언트 연결이 끊어지면 인터벌 중지
    ws.on('close', () => {
      clearInterval(intervalId);
      console.log('클라이언트와의 연결이 끊겼습니다.');
    });
  });
}
