import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import LogMiddleware from './middlewares/log.middleware.js';
import notFoundErrorHandler from './middlewares/notFoundError.middleware.js';
import generalErrorHandler from './middlewares/generalError.middleware.js';
import router from './routes/index.js';
import { prisma } from './utils/prisma/index.js';
import cors from 'cors';
import passportConfig from './utils/passportConfig/index.js';
//import { createClient } from 'redis';
import expressSession from 'express-session';
import expressMySQLSession from 'express-mysql-session';
import passport from 'passport';
//import RedisStore from 'connect-redis';

import { depositEveryday } from './utils/schedule/depositEveryday.js';
import { getAccessToken, getStockPrices, stockCode } from './utils/schedule/currentUpdate.js';
import { deleteOverTTL } from './utils/schedule/deleteOverTTL.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

/*
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: `${process.env.REDIS_PASSWORD}`,
});

await redisClient.connect();
console.log('Redis 서버에 연결되었습니다.');
*/
const MySQLStore = expressMySQLSession(expressSession); // express-session 미들웨어가 세션 정보를 메모리에 저장하는 대신, express-mysql-session을 사용해 MySQL 데이터베이스에 세션 정보를 저장
const sessionStore = new MySQLStore({
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  expiration: 1000 * 60 * 60 * 24,
  createDatabaseTable: true,
});

const sessionMiddleware = expressSession({
  store: sessionStore,
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
  },
});

app.use(sessionMiddleware);
// Passport 초기화 및 세션 사용

app.get('/', (req, res) => {
  res.send('<h1>Stocking</h1>');
});
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

app.use('/api', router);

// // 밑에는 주식 가격을 받아오는 코드인데, 테스트 할때마다  토큰 값을 받아오는게 번거로워서 실제 서비스할때만 사용하도록 하겠습니다.
// // 그러나 절대 필요 없는 코드가 아니니 삭제하시면 안됩니다!

// /**
//  * @description
//  * 서버가 시작될 때, access token을 받아오고 주식의 현재가를 받아옵니다.
//  */
// async function initAccessToken() {
//   await getAccessToken();
//   await new Promise((resolve) => setTimeout(resolve, 1000));
//   await getStockPrices(stockCode);
// }

// /**
//  * @description
//  * 위의 함수를 비동기적으로 실행합니다.
//  */
// (async () => {
//   await initAccessToken();
// })();

// /**
//  * @description
//  * 평일 0시에 access token을 갱신합니다.
//  */
// schedule.scheduleJob('0 0 0 * * 1-5', () => {
//   getAccessToken();
//   getStockPrices(stockCode);
// });
// /**
//  * @description
//  * 평일 9시부터 3시까지 매초 현재가를 받아오고 주문 체결을 처리합니다.
//  */
// schedule.scheduleJob('0-59 0-59 9-14 * * 1-5', () => {
//   if (process.env.ACCESS_TOKEN) {
//     getStockPrices(stockCode);
//   }
// });
// /**
//  * @description
//  * 평일 3시 부터 3시 30분까지 매초 현재가를 받아오고 주문 체결을 처리합니다.
//  */
// schedule.scheduleJob('0-59 0-29 15 * * 1-5', () => {
//   if (process.env.ACCESS_TOKEN) {
//     getStockPrices(stockCode);
//   }
// });
// 현재가 업데이트 및 주문 처리 관련 함수 끝 부분

/**
 * @description
 * 매일 0시에 모든 사용자의 잔액에 1000만 원을 추가합니다.
 */
schedule.scheduleJob('0 0 0 * * *', () => {
  depositEveryday();
});
/**
 * @description
 * 장이 끝난 후 TTL을 지난 데이터를 삭제합니다.
 */
schedule.scheduleJob('10 31 15 * * *', () => {
  deleteOverTTL();
});
/**
 * @description
 * 장 시작전 TTl이 지난 데이터를 삭제합니다.
 */
schedule.scheduleJob('50 59 8 * * *', () => {
  deleteOverTTL();
});

app.use(notFoundErrorHandler);
app.use(generalErrorHandler);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
