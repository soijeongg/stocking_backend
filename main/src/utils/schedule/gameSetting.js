import { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock } from './gameStart.js';
import { deleteDummyUser, deleteCompany, updateStockToCash, updateRankBoard, updateMMR } from './gameEnd.js';

async function gameSetting() {
  await deleteDummyUser();
  await deleteCompany();
  await resetUserMoney();
  await createDummyUser();
  await createCompany();
  await createDummyOrderAndStock();
  console.log('게임 설정이 완료되었습니다.');
}

gameSetting();
