import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import LogMiddleware from './middlewares/log.middleware.js';
import notFoundErrorHandler from './middlewares/notFoundError.middleware.js';
import generalErrorHandler from './middlewares/generalError.middleware.js';
import router from './routes/index.js';
import cors from 'cors';
import passportConfig from './utils/passportConfig/index.js';
import expressSession from 'express-session';
import expressMySQLSession from 'express-mysql-session';
import { createServer } from 'http';
import passport from 'passport';
import { gameSetting } from './utils/schedule/gameSetting.js';
import { createDummyEvent } from './utils/schedule/gameMiddle.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(LogMiddleware);
app.use(
  cors({
    origin: ['http://localhost:5000', 'https://www.stockingchallenge.site'], // 허용할 도메인 목록
    credentials: true, // 쿠키를 포함한 요청을 허용
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

const MySQLStore = expressMySQLSession(expressSession);
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

app.get('/', (req, res) => {
  res.send('<h1>Stocking</h1>');
});
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

app.use('/api', router);

await gameSetting();
setInterval(createDummyEvent, 5000);

app.use(notFoundErrorHandler);
app.use(generalErrorHandler);

server.listen(PORT, () => {
  console.log(`${PORT} 포트로 서버가 열렸어요!`);
});
