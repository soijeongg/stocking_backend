import { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock } from './gameStart.js';
import { deleteDummyUser, deleteCompany, updateStockToCash, updateRankBoard, updateMMR } from './gameEnd.js';
import { insertMatchingMessageQueue } from '../matchingQueue/index.js';

async function gameSetting() {
  await deleteDummyUser();
  await deleteCompany();
  await resetUserMoney();
  await createDummyUser();
  await createCompany();
  await createDummyOrderAndStock();
  const jsonEndData = {
    reqType: 'gameDelete',
  };
  const jsonEndDataString = JSON.stringify(jsonEndData);
  insertMatchingMessageQueue(jsonEndDataString);
  const jsonStartData = {
    reqType: 'gameCreate',
  };
  const jsonStartDataString = JSON.stringify(jsonStartData);
  insertMatchingMessageQueue(jsonStartDataString);
  console.log('게임 설정이 완료되었습니다.');
}

export { gameSetting };
