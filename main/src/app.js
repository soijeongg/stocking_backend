import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import LogMiddleware from './middlewares/log.middleware.js';
import notFoundErrorHandler from './middlewares/notFoundError.middleware.js';
import generalErrorHandler from './middlewares/generalError.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.send('<h1>Monstory</h1>');
});

app.use(notFoundErrorHandler);
app.use(generalErrorHandler);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
