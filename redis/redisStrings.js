import { createClient } from "redis";

async function main() {
  // Redis 클라이언트를 생성합니다. AWS ElasticCache Redis 엔드포인트를 사용하세요.
  const client = createClient();

  client.on("error", (err) => console.log("Redis Client Error", err));
  client.on("connect", () => {
    console.info("Connected to ElastiCache Redis");
  });

  // Redis 서버에 연결합니다.
  await client.connect();

  // 데이터 삽입
  await client.set("key", "value");

  // 데이터 조회
  const value = await client.get("key");
  console.log(value); // 출력: value

  // 데이터 삭제
  await client.del("key");
  // 연결 종료
  await client.quit();
}

main().catch(console.error);
