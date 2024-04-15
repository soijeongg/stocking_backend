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

  // SORTED 셋 관련 명령어
  const sortedSetKey = "userScores";

  // 정렬된 셋에 데이터 추가 (Alice와 Bob)
  await client.sendCommand(["ZADD", sortedSetKey, "10", "Alice"]);
  await client.sendCommand(["ZADD", sortedSetKey, "20", "Bob"]);

  // 점수 업데이트 (Bob의 점수를 15로 변경)
  await client.sendCommand(["ZADD", sortedSetKey, "15", "Bob"]);

  // 정렬된 셋 전체 조회 (점수 오름차순)
  const membersAscRaw = await client.sendCommand(["ZRANGE", sortedSetKey, "0", "-1", "WITHSCORES"]);
  console.log("Ascending (Raw):", membersAscRaw);

  const membersDescRaw = await client.sendCommand([
    "ZREVRANGE",
    sortedSetKey,
    "0",
    "-1",
    "WITHSCORES",
  ]);
  console.log("Descending (Raw):", membersDescRaw);

  // 점수 범위로 요소 조회 (점수가 10 이상 15 이하인 요소)
  const rangeByScoreRaw = await client.sendCommand([
    "ZRANGEBYSCORE",
    sortedSetKey,
    "10",
    "15",
    "WITHSCORES",
  ]);
  console.log("Range by score (Raw):", rangeByScoreRaw);

  // 점수 범위로 요소 조회 (점수가 10 이상 15 이하인 요소)
  const rangeByScore = await client.zRangeByScore(sortedSetKey, 10, 15, { withScores: true });
  console.log("Range by score:", rangeByScore);

  // 연결 종료
  await client.quit();
}

main().catch(console.error);
