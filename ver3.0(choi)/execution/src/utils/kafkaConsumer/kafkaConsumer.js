import { Kafka } from 'kafkajs';
import { execution } from '../executionVer1/index.js';

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
    await consumer.subscribe({ topic: 'executionQueue', fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const messageString = message.value.toString();
        console.log('받은 메시지 문자열', messageString);
        const messageObject = JSON.parse(messageString);
        const orderData = JSON.parse(messageObject[0].value);
        try {
          await execution(orderData.orderType, orderData.userId, orderData.companyId, orderData.orderId, orderData.type, orderData.quantity, orderData.price);
          console.log('주문을 처리했습니다.');
        } catch (error) {
          console.error('주문을 처리하지 못했습니다.', error);
        }
        console.log('Message processed successfully.');
      },
    });
  } catch (err) {
    console.log(err);
  }
};

export { initKafka };
