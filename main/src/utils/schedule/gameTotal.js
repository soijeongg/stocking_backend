import { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock } from './gameStart.js';
import { createDummyEvent } from './gameMiddle.js';
import { deleteDummyUser, deleteCompany, updateStockToCash, updateRankBoard, updateMMR } from './gameEnd.js';

// 0분에서 5분까지 휴식
///5분에서 6분까지 게임 세팅
// 6분에서 11분까지 게임 진행
// 11분에서 12분까지 게임 정리

async function gameTotal() {
  console.log('게임 시작 대기 중...');
  // 게임 시작 대기 (0~5분)
    await new Promise((resolve) => setTimeout(resolve, 300000));

  // 게임 세팅 (5분)
  console.log('게임 세팅 중...');
  await resetUserMoney();
  await createDummyUser();
  await createCompany();
  await createDummyOrderAndStock();

  // 1분 대기 후 게임 진행 시작
  await new Promise((resolve) => setTimeout(resolve, 60000));

  console.log('게임 진행 중...');
  // 게임 진행 (6~11분)
  const eventInterval = setInterval(createDummyEvent, 5000);

  // 게임 진행 중지 (11분 후)
  await new Promise((resolve) =>
    setTimeout(() => {
      clearInterval(eventInterval);
      resolve();
    }, 280000)
  );
  //20초 대기
  await new Promise((resolve) => setTimeout(resolve, 20000));

  // 게임 정리 (11~12분)
  console.log('게임 정리 중...');
  await deleteDummyUser();
  await deleteCompany();
  await updateStockToCash();
  await updateRankBoard();
  await updateMMR();
}
export { gameTotal };
