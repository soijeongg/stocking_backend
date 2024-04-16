import { prisma } from '../prisma/index.js';
import { execution } from '../executionVer0/index.js';
class Queue {
  constructor() {
    this.items = [];
    this.isProcessing = false; // 처리 중인지 상태를 나타내는 플래그
    this.totalProcessingTime = 0; // 총 처리 시간
    this.processedMessageCount = 0; // 처리된 메시지 수
  }

  enqueue(item) {
    this.items.push(item);
    this.startProcessing(); // 항목 추가 시 처리 시작을 시도
  }

  dequeue() {
    if (this.isEmpty()) {
      return null; // 큐가 비어있으면 null 반환
    }
    return this.items.shift();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  // 큐의 처리를 시작하는 함수
  async startProcessing() {
    if (this.isProcessing) {
      return; // 이미 처리 중이면 더 이상 진행하지 않음
    }
    this.isProcessing = true; // 처리 시작

    while (!this.isEmpty()) {
      // console.log(this.items.length);
      const message = this.dequeue();

      const startTime = Date.now(); // 처리 시작 시간
      await this.processMessage(message);
      const endTime = Date.now(); // 처리 완료 시간

      const duration = endTime - startTime; // 처리 시간 계산
      // console.log(`Message processing time: ${duration}ms`); // 처리 시간 로깅
      this.totalProcessingTime += duration; // 총 처리 시간 업데이트
      this.processedMessageCount++; // 처리된 메시지 수 업데이트
      const averageProcessingTime = this.totalProcessingTime / this.processedMessageCount;
      console.log(`Average message processing time: ${averageProcessingTime}ms`);
    }

    this.isProcessing = false; // 모든 항목 처리 완료
  }

  // 실제 메시지를 처리하는 함수
  async processMessage(message) {
    const jsonOrderData = JSON.parse(message);
    const { orderType, userId, companyId, orderId, type, quantity, price } = jsonOrderData;
    if (orderType === 'delete') {
      await prisma.order.delete({
        where: {
          orderId: orderId,
        },
      });
    } else {
      // console.log('execution 시작');
      await execution(userId, companyId, orderId, type, quantity, price);
      // console.log('execution 종료');
    }
  }
}

const orderQueue = new Queue();

async function insertOrderMessageQueue(messageString) {
  orderQueue.enqueue(messageString);
}

export { insertOrderMessageQueue };
