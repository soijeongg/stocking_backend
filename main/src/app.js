import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import LogMiddleware from './middlewares/log.middleware.js';
import notFoundErrorHandler from './middlewares/notFoundError.middleware.js';
import generalErrorHandler from './middlewares/generalError.middleware.js';
import router from './routes/index.js';
import schedule from 'node-schedule';
import { prisma } from './utils/prisma/index.js';
import cors from 'cors';
import passportConfig from './utils/passportConfig/index.js';
//import { createClient } from 'redis';
import expressSession from 'express-session';
import expressMySQLSession from 'express-mysql-session';
import passport from 'passport';
//import RedisStore from 'connect-redis';

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
  res.send('<h1>Monstory</h1>');
});
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

app.use('/api', router);
app.use(notFoundErrorHandler);
app.use(generalErrorHandler);

// 매일 자정에 작업을 실행하기 위한 스케줄 규칙 정의
const rule = new schedule.RecurrenceRule();
rule.hour = 14;
rule.minute = 2;

// 정의된 규칙에 따라 실행될 작업 정의
const job = schedule.scheduleJob(rule, async () => {
  try {
    // 데이터베이스에서 모든 사용자를 가져옴
    const users = await prisma.user.findMany();

    // 각 사용자의 잔액에 1000만 원을 추가함
    await Promise.all(
      users.map(async (user) => {
        await prisma.user.update({
          where: { userId: user.userId },
          data: {
            currentMoney: BigInt(user.currentMoney) + BigInt(10000000), // 1000만 원 추가
          },
        });
      })
    );

    console.log('모든 사용자의 잔액에 1000만 원을 추가했습니다.');
  } catch (error) {
    console.error('사용자 잔액을 업데이트하는 동안 오류가 발생했습니다:', error);
  }
});

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
