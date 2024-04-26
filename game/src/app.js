import { createServer } from 'http';
import express from 'express';
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import notFoundErrorHandler from './middlewares/notFoundError.middleware.js';
import generalErrorHandler from './middlewares/generalError.middleware.js';
import { gameTotal } from './utils/schedule/gameTotal.js';
import { gameSetting } from './utils/schedule/gameSetting.js';
import { createDummyEvent } from './utils/schedule/gameMiddle.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT;

// 실제 서비스는 아래 코드를 사용합니다.
schedule.scheduleJob('*/12 * * * *', async function () {
  await gameTotal();
});

// 테스트 시에는 아래 코드를 사용합니다.
// await gameSetting();
// setInterval(createDummyEvent, 5000);

app.use(notFoundErrorHandler);
app.use(generalErrorHandler);
server.listen(PORT, () => {
  console.log(PORT, '포트로 게임 서버가 열렸어요!');
});
