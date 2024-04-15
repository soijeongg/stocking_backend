import { createClient } from "redis";

async function main() {
  // Redis 클라이언트 생성. AWS ElasticCache Redis 엔드포인트를 사용하는 경우 설정 필요.
  const client = createClient();

  client.on("error", (err) => console.log("Redis Client Error", err));
  client.on("connect", () => {
    console.info("Connected to ElastiCache Redis");
  });

  // Redis 서버에 연결
  await client.connect();

  // 리스트 관련 명령어
  const listKey = "userList";

  // 리스트의 왼쪽(앞)에 데이터 추가
  await client.lPush(listKey, "Alice");
  // 리스트의 오른쪽(끝)에 데이터 추가
  await client.rPush(listKey, "Bob");

  // 리스트 전체 조회 (0부터 -1은 리스트의 처음부터 끝까지를 의미)
  const listItems = await client.lRange(listKey, 0, -1);
  console.log(listItems); // 출력: ['Alice', 'Bob']

  // 리스트의 왼쪽(앞)에서 데이터 제거하고 그 값을 반환
  const leftPop = await client.lPop(listKey);
  console.log(`Left Pop: ${leftPop}`); // 출력: Left Pop: Alice

  // 리스트의 오른쪽(끝)에서 데이터 제거하고 그 값을 반환
  const rightPop = await client.rPop(listKey);
  console.log(`Right Pop: ${rightPop}`); // 출력: Right Pop: Bob

  // 연결 종료
  await client.quit();
}

main().catch(console.error);
