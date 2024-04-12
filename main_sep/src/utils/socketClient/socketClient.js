// src/utils/socketClient.js
import WebSocket from 'ws';

const SOCKET_SERVER_URL = 'ws://localhost:4000';

const socketClient = new WebSocket(SOCKET_SERVER_URL);

socketClient.on('open', function open() {
  console.log('소켓 서버에 연결됨');
});

export function sendNoticeToSocketServer(message) {
  if (socketClient.readyState === WebSocket.OPEN) {
    // 메시지 타입에 따라 'notices' 또는 'personal'을 할당
    const messageType = message.userId ? 'personal' : 'broadcast';
    const payload = {
      type: messageType,
      ...message,
    };
    socketClient.send(JSON.stringify(payload));
  } else {
    console.log('소켓 서버에 연결되지 않음');
  }
}
