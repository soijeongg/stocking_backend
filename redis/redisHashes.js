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

  // 해시 데이터 삽입
  // user:1000은 해시의 이름(키)이고, name과 age는 필드, 각각의 값으로 "John Doe"와 30이 저장됩니다.
  await client.hSet("user:1000", "name", "John Doe");
  await client.hSet("user:1000", "age", "30");

  // 개별 필드 조회
  const name = await client.hGet("user:1000", "name");
  console.log(`Name: ${name}`); // 출력: Name: John Doe

  // 전체 해시 조회
  const user = await client.hGetAll("user:1000");
  console.log(user); // 출력: { name: 'John Doe', age: '30' }

  // 데이터 삭제
  await client.del("user:1000");

  const deletedUser = await client.hGetAll("user:1000");
  console.log(deletedUser);

  // 연결 종료
  await client.quit();
}

main().catch(console.error);
