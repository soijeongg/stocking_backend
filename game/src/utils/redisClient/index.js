import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  password: `${process.env.REDIS_PASSWORD}`,
  connectTimeout: 10000,
});

const connectWithRetry = async (retryCount = 0, maxRetries = 5) => {
  if (redisClient.isOpen) {
    return;
  }
  if (redisClient.isReady) {
    return;
  }
  try {
    await redisClient.connect();
  } catch (err) {
    console.log(err);
    if (retryCount < maxRetries) {
      console.log(`Retrying to connect... Attempt ${retryCount + 1}/${maxRetries}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
      await connectWithRetry(retryCount + 1, maxRetries);
    }
  }
};

await connectWithRetry();
console.log('Redis 서버에 연결되었습니다.');

export default redisClient;
