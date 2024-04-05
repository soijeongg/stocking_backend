import { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock } from './gameStart.js';
import { createDummyEvent } from './gameMiddle.js';
import { deleteDummyUser, deleteCompany, updateStockToCash, updateRankBoard, updateMMR } from './gameEnd.js';

async function gameTotal() {
  console.log('게임 세팅 중...1분뒤 시작입니다!');
  await resetUserMoney();
  await createDummyUser();
  await createCompany();
  await createDummyOrderAndStock();

  // 1분 대기 후 게임 시작
  await new Promise((resolve) => setTimeout(resolve, 60000));
  // 게임 시작(1분)
  console.log('게임 시작!');
  // 게임 이벤트 생성 (5초마다)
  const eventInterval = setInterval(createDummyEvent, 5000);

  // 게임 이벤트 중지 (5분 40초)
  await new Promise((resolve) =>
    setTimeout(() => {
      clearInterval(eventInterval);
      resolve();
    }, 280000)
  );
  //20초 대기
  await new Promise((resolve) => setTimeout(resolve, 20000));

  // 게임 정리 (6분)
  console.log('게임 종료! 결과 정리 중...');
  await deleteDummyUser();
  await deleteCompany();
  await updateStockToCash();
  await updateRankBoard();
  await updateMMR();
  console.log('게임 종료!');
}
export { gameTotal };
