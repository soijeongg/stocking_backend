import WebSocket from 'ws';

const socketClient = new WebSocket(process.env.SOCKET_SERVER_URL);

socketClient.on('open', function open() {
  console.log('소켓 서버에 연결됨');
});

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
