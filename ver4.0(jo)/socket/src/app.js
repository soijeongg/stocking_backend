import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import setupWebSocketServer from './utils/dataProcesser/dataProcesser.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 4000;

setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`${PORT} 포트로 서버가 시작되었습니다.`);
});
