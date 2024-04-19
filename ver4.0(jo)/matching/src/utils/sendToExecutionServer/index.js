import { Kafka } from 'kafkajs'; // kafkajs 패키지에서 Kafka를 import합니다

// Kafka 클라이언트를 생성합니다.
const kafka = new Kafka({
  clientId: 'matching-server',
  brokers: ['52.79.201.23:9092', '43.200.179.176:9092', '13.124.81.159:9092'],
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
async function sendToExecutionServer(message) {
  try {
    await producer.send({
      topic: 'executionQueue',
      messages: [{ value: message }],
    });
    console.log('Successfully sent message to matchingQueue:', message);
  } catch (error) {
    console.error('Error sending message to matchingQueue:', error);
  }
}

initKafka();

export { sendToExecutionServer };
