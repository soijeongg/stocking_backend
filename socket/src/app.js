import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import setupWebSocketServer from './utils/dataProcesser/dataProcesser.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

setupWebSocketServer(server);
// 로드밸런싱 헬스 체크를 위해 루트 경로에 간단한 텍스트를 응답합니다.
app.get('/', (req, res) => {
  res.send('<h1>Stocking Socket</h1>');
});
server.listen(PORT, () => {
  console.log(`${PORT} 포트로 소켓 서버가 열렸어요!`);
});
