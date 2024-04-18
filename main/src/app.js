import { createServer } from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import schedule from 'node-schedule';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import passportConfig from './utils/passportConfig/index.js';
import { register, Counter, Histogram } from 'prom-client';
import LogMiddleware from './middlewares/log.middleware.js';
import notFoundErrorHandler from './middlewares/notFoundError.middleware.js';
import generalErrorHandler from './middlewares/generalError.middleware.js';
import router from './routes/index.js';
import { gameTotal } from './utils/schedule/gameTotal.js';
import { gameSetting } from './utils/schedule/gameSetting.js';
import { createDummyEvent } from './utils/schedule/gameMiddle.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT;

//app.use(LogMiddleware);
app.use(
  cors({
    origin: ['http://localhost:5000', 'https://www.stockingchallenge.site'], // 허용할 도메인 목록
    credentials: true, // 쿠키를 포함한 요청을 허용
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: `${process.env.REDIS_PASSWORD}`,
});

await redisClient.connect();
console.log('Redis 서버에 연결되었습니다.');

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// RedisStore 인스턴스 생성 및 sessionStore 변수에 할당
const sessionStore = new RedisStore({ client: redisClient });

const sessionMiddleware = session({
  store: sessionStore, // 이전에 생성한 sessionStore 인스턴스 사용
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
// 실제 서비스는 아래 코드를 사용합니다.
// schedule.scheduleJob('*/12 * * * *', async function () {
//   await gameTotal();
// });

// 테스트 시에는 아래 코드를 사용합니다.
await gameSetting();
// setInterval(createDummyEvent, 5000);
setInterval(createDummyEvent, 5000);

app.use(notFoundErrorHandler);
app.use(generalErrorHandler);
server.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
