import { Kafka } from 'kafkajs'; // kafkajs 패키지에서 Kafka를 import합니다
import { matching } from '../matching/index.js';

// Kafka 클라이언트를 생성합니다.
const kafka = new Kafka({
  clientId: 'matching-server',
  brokers: ['52.79.201.23:9092', '43.200.179.176:9092', '13.124.81.159:9092'],
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

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await matching(message.value);
        console.log('Message processed successfully.');
      },
    });
  } catch (err) {
    console.log(err);
  }
};

export { initKafka };
