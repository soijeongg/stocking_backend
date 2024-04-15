import Redis from "ioredis";

async function main() {
  // AWS ElasticCache Redis 엔드포인트로 Redis 클라이언트를 생성합니다.
  // 예시: const redis = new Redis("redis://your-elasticache-endpoint:6379");
  const redis = new Redis({
    // 여기에 연결 정보를 입력하세요. 예를 들어,
    // host: "your-elasticache-endpoint",
    // port: 6379
  });

  redis.on("error", (err) => console.log("Redis Client Error", err));
  redis.on("connect", () => {
    console.info("Connected to ElastiCache Redis");
  });

  try {
    // 데이터 삽입
    await redis.set("key", "value");

    // 데이터 조회
    const value = await redis.get("key");
    console.log(value); // 출력: value

    // 데이터 삭제
    await redis.del("key");
  } catch (error) {
    console.error(error);
  } finally {
    // 연결 종료
    await redis.quit();
  }
}

main().catch(console.error);
