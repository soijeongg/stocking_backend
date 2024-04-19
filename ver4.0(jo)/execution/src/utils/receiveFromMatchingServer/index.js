import { Kafka } from 'kafkajs'; // kafkajs 패키지에서 Kafka를 import합니다
import { execution } from '../execution/index.js';

// Kafka 클라이언트를 생성합니다.
const kafka = new Kafka({
  clientId: 'execution-server',
  brokers: [`${process.env.KAFKA_IP1}`, `${process.env.KAFKA_IP2}`, `${process.env.KAFKA_IP2}`],
});
const consumer = kafka.consumer({ groupId: 'execution-group' });

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
    await consumer.subscribe({ topic: 'executionQueue', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        await execution(message.value);
        console.log('Message processed successfully.');
      },
    });
  } catch (err) {
    console.log(err);
  }
};

export { initKafka };
