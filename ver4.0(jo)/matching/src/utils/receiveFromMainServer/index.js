import { Kafka } from 'kafkajs'; // kafkajs 패키지에서 Kafka를 import합니다
import { matching } from '../matching/index.js';

// Kafka 클라이언트를 생성합니다.
const kafka = new Kafka({
  clientId: 'matching-server',
  brokers: [`${process.env.KAFKA_IP1}`, `${process.env.KAFKA_IP2}`, `${process.env.KAFKA_IP2}`],
});
const consumer = kafka.consumer({ groupId: 'matching-group' });

consumer.on(consumer.events.CONNECT, () => {
  console.log('Kafka Consumer is connected and ready.');
});

consumer.on(consumer.events.DISCONNECT, () => {
  console.error('Kafka Consumer has disconnected.');
});

const initKafka = async () => {
  try {
    console.log('start subscribe');
    await consumer.connect();
    await consumer.subscribe({ topic: 'matchingQueue', fromBeginning: false });
    let matchingTimeSum = 0;
    let matchingCount = 0;
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const messageString = message.value.toString();
        console.log('받은 메시지 문자열', messageString);
        const startTime = Date.now();
        const result = await matching(messageString);
        if (result === 'success') {
          const endTime = Date.now();
          const matchingTime = endTime - startTime;
          matchingTimeSum += matchingTime;
          matchingCount++;
          const averageMatchingTime = matchingTimeSum / matchingCount;
          console.log(`현재까지의 평균 매칭 처리 시간: ${averageMatchingTime.toFixed(2)}ms`);
        }
        console.log('Message processed successfully.');
      },
    });
  } catch (err) {
    console.log(err);
  }
};

export { initKafka };
