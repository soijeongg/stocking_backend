import { createClient } from "redis";

const client = createClient();

client.on("error", (err) => console.log("Redis Client Error", err));
client.on("connect", () => {
  console.info("Connected to ElastiCache Redis");
});

// Redis 서버에 연결
await client.connect();

let cursor = "0";
do {
  const reply = await client.scan(cursor, "MATCH", "*", "COUNT", "100");
  console.log(reply);
  cursor = reply.cursor.toString(); // cursor 값을 문자열로 명시적으로 변환
  const keys = reply.keys;

  for (const key of keys) {
    const type = await client.type(key);
    console.log(`${key} is a ${type}`);
  }
} while (cursor !== "0"); // 문자열 "0"과 비교

await client.quit();
