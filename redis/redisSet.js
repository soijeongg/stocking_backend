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

  // 셋 관련 명령어
  const setKey = "userSet";

  // 셋에 데이터 추가
  await client.sAdd(setKey, "Alice");
  await client.sAdd(setKey, "Bob");
  await client.sAdd(setKey, "Alice"); // "Alice"는 이미 존재하기 때문에 추가되지 않습니다.

  // 셋의 모든 멤버 조회
  const members = await client.sMembers(setKey);
  console.log(members); // 출력: ['Alice', 'Bob']

  // 특정 멤버의 존재 여부 확인
  const isMember = await client.sIsMember(setKey, "Alice");
  console.log(`Is Alice a member? ${isMember}`); // 출력: Is Alice a member? true

  // 셋에서 데이터 제거
  await client.sRem(setKey, "Alice");

  // 제거 후 셋의 멤버 조회
  const membersAfterRemoval = await client.sMembers(setKey);
  console.log(membersAfterRemoval); // 출력: ['Bob']

  // 연결 종료
  await client.quit();
}

main().catch(console.error);
