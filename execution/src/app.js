import { createServer } from 'http';
import express from 'express';
import dotenv from 'dotenv';
import generalErrorHandler from './middlewares/generalError.middleware.js';
import { initKafka } from './utils/kafkaConsumer/kafkaConsumer.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT;

initKafka();

app.use(generalErrorHandler);
server.listen(PORT, () => {
  console.log(PORT, '포트로 체결 서버가 열렸어요!');
});
