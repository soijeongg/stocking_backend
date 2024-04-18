import { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock } from './gameStart.js';
import { createDummyEvent } from './gameMiddle.js';
import { deleteDummyUser, deleteCompany, updateStockToCash, updateRankBoard, updateMMR } from './gameEnd.js';
import { sendNoticesToClient, sendNoticesToAllClients } from '../socketConnecter/socketConnecter.js';

async function waitForMinuteRemainder(minute) {
  return new Promise((resolve) => {
    if (minute < 0 || minute >= 12) {
      throw new Error('minute must be between 0 and 11');
    }

    const checkAndResolve = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const remainder = minutes % 12;

      if (remainder === minute) {
        resolve();
      } else {
        // minute에 도달하기까지 남은 시간을 계산
        let waitTime = ((minute - remainder + 12) % 12) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
        // 최소 1초 대기를 보장하기 위한 조건
        if (waitTime <= 0) {
          waitTime += 12 * 60 * 1000;
        }
        setTimeout(checkAndResolve, waitTime);
      }
    };

    checkAndResolve();
  });
}
const notifyTimeRemaining = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const remainder = minutes % 12;
  const timeUntilNext6Minute = (6 - remainder + 12) % 12;

  // 남은 시간 계산 (시간과 분)
  let timeRemainingMinutes = timeUntilNext6Minute - 1;
  let timeRemainingSeconds = 60 - seconds;

  if (timeRemainingSeconds === 60) {
    // 정확히 분이 바뀌는 순간, 초를 0으로 설정하고 분을 조정
    timeRemainingSeconds = 0;
    timeRemainingMinutes += 1;
  }

  // 남은 시간 알림
  sendNoticesToAllClients(`게임종료까지 남은 시간 : ${timeRemainingMinutes}분 ${timeRemainingSeconds}초`);
};
async function gameTotal() {
  await deleteDummyUser();
  await deleteCompany();
  sendNoticesToAllClients('게임 세팅 중...1분뒤 시작입니다!');
  await resetUserMoney();
  await createDummyUser();
  await createCompany();
  await createDummyOrderAndStock();
  await waitForMinuteRemainder(1);
  // 게임 시작(1분)
  sendNoticesToAllClients('게임 시작!...게임 시간은 5분간 진행됩니다!');
  // 게임 이벤트 생성 (5초마다)
  const eventInterval = setInterval(createDummyEvent, 5000);
  // 현재 분을 12로 나눈뒤에  6분이 되기까지 남은 시간을 "게임종료까지 남은 시간 : 00분 00초"로 출력
  const noticeInterval = setInterval(notifyTimeRemaining, 15000);
  // 게임 이벤트 중지 (5분 40초)
  await new Promise((resolve) =>
    setTimeout(() => {
      clearInterval(eventInterval);
      clearInterval(noticeInterval);
      resolve();
    }, 280000)
  );
  // 게임 정리 (6분)
  await waitForMinuteRemainder(6);
  sendNoticesToAllClients('게임 종료! 결과 정리 중...');
  await deleteDummyUser();
  await updateStockToCash();
  await deleteCompany();
  await updateRankBoard();
  await updateMMR();
  sendNoticesToAllClients('랭킹이 업데이트 되었습니다!');
}
export { gameTotal };
