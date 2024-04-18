import WebSocket from 'ws';

let socketClient;
const reconnectInterval = 3000; // 재연결 시도 간격(ms)

function connect() {
  socketClient = new WebSocket(process.env.SOCKET_SERVER_URL);

  socketClient.on('open', function open() {
    console.log('소켓 서버에 연결됨');
  });

  socketClient.on('close', function close() {
    console.log('소켓 서버 연결 끊김. 재연결 시도...');
    setTimeout(connect, reconnectInterval); // 연결이 끊긴 후 재연결 시도
  });

  socketClient.on('error', function error(err) {
    console.error('소켓 서버 연결 에러:', err);
    socketClient.close(); // 에러 발생 시 연결을 명시적으로 닫아 재연결 시도
  });
}

// 모든 사용자에게 메시지 전달
export function sendNoticesToAllClients(notices) {
  if (socketClient.readyState === WebSocket.OPEN) {
    socketClient.send(JSON.stringify({ type: 'broadcast', notices }));
  } else {
    console.log('소켓 서버에 연결되지 않음');
  }
}

// 개별 사용자에게 메시지 전달
export function sendNoticesToClient(userId, notices) {
  if (socketClient.readyState === WebSocket.OPEN) {
    socketClient.send(JSON.stringify({ type: 'personal', userId, notices }));
  } else {
    console.log('소켓 서버에 연결되지 않음');
  }
}

connect(); // 연결 시작
