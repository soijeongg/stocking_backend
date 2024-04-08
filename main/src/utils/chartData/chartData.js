import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { parse } from 'cookie';
import { prisma } from '../prisma/index.js';
import { deleteSessionsByUserId } from '../../app.js';
let wss;
const clients = new Map();
let notices = [];
const clients_id = new Map();
function setupWebSocketServer(server, sessionStore) {
  wss = new WebSocketServer({ server });

  wss.on('connection', async function connection(ws, req) {
    // const requestUrl = new URL(req.url, 'ws://localhost:3000/ws/chartData/:companyId'); // 기본 URL을 제공해야 합니다.
    //console.log('Received request URL:', req.url);
    const sessionCookie = req.headers.cookie;
    const session = await findSessionByCookie(sessionCookie, sessionStore);
    if (!session) {
      console.log('세션 정보를 찾을 수 없습니다.');
      ws.close(); // 세션 정보가 없는 경우 연결 종료
      return;
    }

    //console.log('session: ' + JSON.stringify(session, null, 2));
    const userId = session.passport?.user;
    if (!userId) {
      console.log('세션에서 사용자 ID를 찾을 수 없습니다.');
      ws.close(); // 사용자 ID가 없는 경우 종료
      return;
    }

    clients_id.set(userId, ws); // 사용자 ID를 키로 WebSocket 연결 저장

    const pathSegments = req.url.split('/');
    if (pathSegments[1] === 'ws' && pathSegments[2] === 'chartData') {
      const companyId = Number(pathSegments[pathSegments.length - 1]);
      console.log(companyId);

      console.log('클라이언트가 연결되었습니다.');

      const getCurrentPrice = async () => {
        let price = await prisma.Company.findFirst({
          select: { currentPrice: true, initialPrice: true, highPrice: true, lowPrice: true },
          where: { companyId: +companyId },
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
    } else if (pathSegments[1] === 'ws' && pathSegments[2] === 'orderData') {
      const companyId = Number(pathSegments[pathSegments.length - 1]);
      console.log('클라이언트가 연결되었습니다');

      const getCurrentOrder = async () => {
        let priceResult = await prisma.company.findFirst({
          select: { currentPrice: true },
          where: { companyId: companyId },
        });

        if (priceResult) {
          let currentPrice = priceResult.currentPrice;
          let groupedOrders = await prisma.order.groupBy({
            by: ['type', 'price'], // type과 price로 그룹화합니다.
            where: {
              companyId: companyId,
              price: {
                gte: currentPrice - 50000,
                lte: currentPrice + 50000,
              },
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
          groupedOrders.sort((a, b) => {
            if (a.price === b.price) {
              return a.type === 'sell' ? -1 : 1;
            }
            return b.price - a.price;
          });
          ws.send(JSON.stringify({ groupedOrders, currentPrice }));
        } else {
          console.log('Company not found or currentPrice is undefined');
          ws.send(JSON.stringify({ groupedOrders: [], currentPrice: null })); // 또는 적절한 오류 메시지
        }
      };
      // 1초마다 가격 정보 전송
      const intervalId = setInterval(getCurrentOrder, 1000);
      // 클라이언트 연결이 끊어지면 인터벌 중지
      ws.on('close', () => {
        clearInterval(intervalId);
        console.log('클라이언트와의 연결이 끊겼습니다.');
      });
    } else if (pathSegments[1] === 'ws' && pathSegments[2] === 'chatting') {
      console.log('클라이언트가 연결되었습니다.');

      const sessionCookie = req.headers.cookie;
      const session = await findSessionByCookie(sessionCookie, sessionStore);
      if (!session) {
        console.log('세션 정보를 찾을 수 없습니다.');
        ws.close(); // 세션 정보가 없는 경우 연결 종료
        return;
      }

      // console.log('session: ' + JSON.stringify(session, null, 2));
      const userId = session.passport?.user;
      if (!userId) {
        console.log('세션에서 사용자 ID를 찾을 수 없습니다.');
        ws.close(); // 사용자 ID가 없는 경우 종료
        return;
      }

      clients.set(userId, ws); // 사용자 ID를 키로 WebSocket 연결 저장

      const nickname = await getUserNickname(userId);
      // console.log('nickname: ', nickname);

      ws.on('message', function incoming(message) {
        const messageData = JSON.parse(message);
        const { text, receiverId } = messageData; // 수신자 ID 포함

        console.log(`${nickname}: ${text}`);

        if (receiverId && clients.has(receiverId)) {
          const receiverWs = clients.get(receiverId);
          if (receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({ nickname, text })); // 지정된 수신자에게만 메시지 전송
          }
        } else {
          // 수신자가 지정되지 않았거나 찾을 수 없는 경우 모든 클라이언트에게 메시지 브로드캐스트 (선택적)
          wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ nickname, text }));
            }
          });
        }
      });

      ws.on('close', () => {
        console.log('클라이언트와의 연결이 끊겼습니다.');
        clients.delete(userId); // 연결이 종료되면 클라이언트 목록에서 제거
      });
    }
  });
}

// 세션 쿠키를 사용하여 세션 스토어에서 세션 정보를 조회하는 함수
async function findSessionByCookie(sessionCookie, sessionStore) {
  if (!sessionCookie) return null;

  // express-session은 기본적으로 세션 쿠키 이름으로 'connect.sid'를 사용 + 우리 쿠키 이름도
  const sessionIdCookie = parse(sessionCookie)['connect.sid'];
  if (!sessionIdCookie) return null;

  // 세션 ID를 추출하기 위한 정규 표현식
  const sid = sessionIdCookie.split(':')[1].split('.')[0];
  if (!sid) return null;

  return new Promise((resolve, reject) => {
    sessionStore.get(sid, (err, session) => {
      if (err) reject(err);
      else resolve(session);
    });
  });
}

async function getUserNickname(userId) {
  const user = await prisma.user.findUnique({
    where: { userId: +userId },
  });
  return user?.nickname; // 'nickname'은 유저 모델의 닉네임 필드입니다.
}

// 프론트로 메시지를 보내기 위해 사용(sendNoticesToAllClients, sendNoticesToClient)

// 모든 사용자에게 메시지 전달
export function sendNoticesToAllClients(notices) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'notices', notices }));
    }
  });
}

// 개별 사용자에게 메시지 전달
export function sendNoticesToClient(userId, notices) {
  if (clients.has(userId)) {
    const client = clients.get(userId);
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'notices', notices }));
    }
  }
}

export async function sendSocketMessage(userId, notice) {
  const ws = clients_id.get(userId);
  if (ws) {
    if (ws.readyState === WebSocket.OPEN) {
      notices.push(notice);
      ws.send(JSON.stringify({ type: 'notices', notices }));

      console.log(`Message sent to user ${userId}:`, notice);
      const index = notices.indexOf(notice);
      if (index !== -1) {
        notices.splice(index, 1);
      }

      // 여기에 세션 삭제 부분 추가
      await deleteSessionsByUserId(userId);
    } else {
      console.log(`WebSocket connection for user ${userId} is not open.`);
    }
  } else {
    console.log(`WebSocket connection for user ${userId} not found.`);
  }
}

export default setupWebSocketServer;
