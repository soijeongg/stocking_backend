class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(item) {
    this.items.push(item); // 큐의 끝에 요소 추가
  }

  dequeue() {
    if (this.isEmpty()) {
      return 'Queue is empty';
    }
    return this.items.shift(); // 큐의 앞에서 요소 제거 및 반환
  }

  isEmpty() {
    return this.items.length === 0; // 큐가 비어있는지 확인
  }

  peek() {
    if (this.isEmpty()) {
      return 'Queue is empty';
    }
    return this.items[0]; // 큐의 맨 앞 요소 반환
  }

  size() {
    return this.items.length; // 큐의 크기 반환
  }
}
const orderQueue = new Queue();

async function insertOrderMessageQueue(messageString) {
  orderQueue.enqueue(messageString);
  while (!orderQueue.isEmpty()) {
    const message = orderQueue.dequeue();
  }
}
export { insertOrderMessageQueue };
