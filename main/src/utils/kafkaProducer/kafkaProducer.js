import { Kafka } from 'kafkajs';

// Kafka 클라이언트 설정
const kafka = new Kafka({
  clientId: 'my-producer', // 클라이언트 ID 변경
  brokers: [process.env.KAFKA_IP1, process.env.KAFKA_IP2, process.env.KAFKA_IP3],
});

// Kafka Producer 인스턴스 생성
const producer = kafka.producer();

// Producer 연결 초기화 함수
const initializeProducer = async () => {
  await producer.connect();
  console.log('Kafka Producer가 연결되었습니다!');
};

// Producer 연결 해제 함수
const terminateProducer = async () => {
  await producer.disconnect();
  console.log('Kafka Producer가 연결이 해제되었습니다!');
};

// 메시지 전송 함수
export const sendMessage = async (topic, messages) => {
  try {
    await producer.send({
      topic: 'executionQueue',
      messages: [{ value: JSON.stringify(messages) }],
    });
    // console.log(`메세지: `, JSON.stringify(messages));
    // console.log(`메세지가 kafka서버에 보내졌습니다. 토픽: ${topic}`);
  } catch (error) {
    console.error(`kafka통신에 에러가 발생했습니다. 토픽 ${topic}:`, error.message);
    throw new Error(`Kafka sendMessage error: ${error.message}`);
  }
};

// 초기화 및 종료 로직을 모듈 외부에서 호출할 수 있도록 export
export { initializeProducer, terminateProducer };
