import { createClient } from "redis";

const client = createClient();

client.on("error", (err) => console.log("Redis Client Error", err));
client.on("connect", () => {
  console.info("Connected to ElastiCache Redis");
});

// Redis 서버에 연결
await client.connect();

await client.flushAll();

await client.quit();
