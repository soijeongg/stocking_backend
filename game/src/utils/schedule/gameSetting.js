import { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock, sendMatchingServerGameStart } from './gameStart.js';
import { deleteDummyUser, deleteCompany, updateStockToCash, updateRankBoard, updateMMR, sendMatchingServerGameEnd } from './gameEnd.js';

async function gameSetting() {
  await deleteDummyUser();
  await deleteCompany();
  await resetUserMoney();
  await createDummyUser();
  await createCompany();
  await createDummyOrderAndStock();
  await sendMatchingServerGameEnd();
  await sendMatchingServerGameStart();
  console.log('게임 설정이 완료되었습니다.');
}

export { gameSetting };
