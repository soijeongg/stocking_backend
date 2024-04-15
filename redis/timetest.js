const nowDate = new Date();
const diffTime = nowDate.getTime() - new Date("2024-01-01").getTime();
console.log(diffTime);
const minTime = diffTime / 100000000000;
console.log(minTime);
