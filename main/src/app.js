import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import LogMiddleware from './middlewares/log.middleware.js';
import notFoundErrorHandler from './middlewares/notFoundError.middleware.js';
import generalErrorHandler from './middlewares/generalError.middleware.js';
import router from './routes/index.js';
import { getStockPrices, getAccessToken, stockCode } from './utils/companyInfo/currentRenewal.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.send('<h1>Stocking</h1>');
});
app.use('/api', router);
app.use(notFoundErrorHandler);
app.use(generalErrorHandler);

// 기본적으로 서버가 실행될때, accesstoken과 현재가 갱신을 합니다.
await getAccessToken();
await getStockPrices(stockCode);
// 평일 0시 0분 0초에 accesstoken과 현재가 갱신을 합니다.
schedule.scheduleJob('0 0 0 * * 1-5', () => {
  getAccessToken();
  getStockPrices(stockCode);
});
//평일 9시부터 15시까지 1초마다 현재가 갱신을 합니다.
schedule.scheduleJob('0-59 9-15 * * 1-5', () => {
  getStockPrices(stockCode);
});
// 오후 3시부터 3시 30분까지 매초 실행
schedule.scheduleJob('0-30 15 * * 1-5', () => {
  getStockPrices(stockCode);
});

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
