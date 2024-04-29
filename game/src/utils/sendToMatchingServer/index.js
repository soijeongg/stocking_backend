import { Kafka } from 'kafkajs'; // kafkajs 패키지에서 Kafka를 import합니다
const kafka = new Kafka({
  clientId: 'main-server',
  brokers: [`${process.env.KAFKA_IP1}`, `${process.env.KAFKA_IP2}`, `${process.env.KAFKA_IP3}`],
  idempotent: true,
});
const producer = kafka.producer();

// 연결 상태 이벤트 리스너 설정
producer.on(producer.events.CONNECT, () => {
  console.log('Kafka Producer is connected and ready.');
});

producer.on(producer.events.DISCONNECT, () => {
  console.error('Kafka Producer has disconnected.');
});

const initKafka = async () => {
  await producer.connect();
};
async function sendToMatchingServer(message) {
  try {
    await producer.send({
      topic: 'matchingQueue',
      messages: [{ value: message }],
    });
    console.log('Successfully sent message to matchingQueue:', message);
  } catch (error) {
    console.error('Error sending message to matchingQueue:', error);
  }
}

initKafka();

export { sendToMatchingServer };
