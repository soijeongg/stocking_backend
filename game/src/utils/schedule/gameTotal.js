import { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock, sendMatchingServerGameStart } from './gameStart.js';
import { createDummyEvent, createDummyOrderToPreventEmptyOrderBook } from './gameMiddle.js';
import { deleteDummyUser, deleteCompany, updateStockToCash, updateRankBoard, updateMMR, sendMatchingServerGameEnd } from './gameEnd.js';
import { sendNoticesToAllClients } from '../socketConnecter/socketConnecter.js';
/**
 * @description 지정된 분의 나머지에 도달할 때까지 대기하는 비동기 함수
 * 예를 들어 minute 파라미터로 5를 전달받으면, 현재 시간의 분(minute)이 12로 나눈 나머지가 5가 될 때까지 대기
 * @param {number} minute - 대기를 원하는 분의 나머지 값 (0~11 사이).
 * @returns {Promise<void>} 지정된 분의 나머지에 도달했을 때 해결되는 Promise.
 * @throws {Error} 입력된 minute 값이 0 미만이거나 11 초과인 경우 오류를 발생
 */
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
        let waitTime = ((minute - remainder + 12) % 12) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
        if (waitTime <= 0) {
          waitTime += 12 * 60 * 1000;
        }
        setTimeout(checkAndResolve, waitTime);
      }
    };
    checkAndResolve();
  });
}
/**
 * @description 주기적으로 클라이언트에게 게임 종료까지 남은 시간을 알립니다.
 * 웹소켓을 사용하여 클라이언트에게 알림을 보냅니다.
 */
const notifyTimeRemaining = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const remainder = minutes % 12;
  // 6분까지 남은 시간 계산
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
/**
 * @description 주기적으로 클라이언트에게 다음 게임 시작까지 남은 시간을 알립니다.
 * 웹소켓을 사용하여 클라이언트에게 알림을 보냅니다.
 */
const notifyTimeRemaining2 = () => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const remainder = minutes % 12;
  // 6분까지 남은 시간 계산
  const timeUntilNext6Minute = (24 - remainder) % 12;
  // 남은 시간 계산 (시간과 분)
  let timeRemainingMinutes = timeUntilNext6Minute - 1;
  let timeRemainingSeconds = 60 - seconds;

  if (timeRemainingSeconds === 60) {
    // 정확히 분이 바뀌는 순간, 초를 0으로 설정하고 분을 조정
    timeRemainingSeconds = 0;
    timeRemainingMinutes += 1;
  }
  // 남은 시간 알림
  sendNoticesToAllClients(`다음 게임까지 남은 시간 : ${timeRemainingMinutes}분 ${timeRemainingSeconds}초`);
};
async function gameTotal() {
  await sendMatchingServerGameEnd();
  await deleteDummyUser(); //더미 유저 삭제
  await deleteCompany(); //회사 삭제
  sendNoticesToAllClients('게임 세팅 중...1분뒤 시작입니다!'); //게임 세팅 알림
  await resetUserMoney(); //유저 초기화
  await createDummyUser(); //더미 유저 생성
  await createCompany(); //회사 생성
  await createDummyOrderAndStock(); //주식 생성
  await sendMatchingServerGameStart();
  await waitForMinuteRemainder(1); //1분까지 기다림
  sendNoticesToAllClients('게임 시작!...게임 시간은 5분간 진행됩니다!'); //게임 시작 알림
  // 게임 이벤트 생성 (5초마다)
  const eventInterval = setInterval(createDummyEvent, 5000);
  // 현재 분을 12로 나눈뒤에  6분이 되기까지 남은 시간을 "게임종료까지 남은 시간 : 00분 00초"로 출력
  const noticeInterval = setInterval(notifyTimeRemaining, 15000);
  // 빈 주문서를 방지하기 위한 주문 생성 (1초마다)
  const orderInterval = setInterval(createDummyOrderToPreventEmptyOrderBook, 1000);
  // 게임 이벤트, 남은 시간 공지, 빈 주문 방지 (5분 45초까지)
  await new Promise((resolve) =>
    setTimeout(() => {
      clearInterval(eventInterval);
      clearInterval(noticeInterval);
      clearInterval(orderInterval);
      resolve();
    }, 284500)
  );
  // 남은 시간 공지, 빈 주문 방지 (14초)
  await new Promise((resolve) =>
    setTimeout(() => {
      clearInterval(noticeInterval);
      clearInterval(orderInterval);
      resolve();
    }, 14000)
  );
  // 게임 정리 (6분)
  await waitForMinuteRemainder(6); //6분까지 기다림
  sendNoticesToAllClients('게임 종료! 결과 정리 중...'); //게임 종료 알림
  await deleteDummyUser(); //더미 유저 삭제
  await updateStockToCash(); //주식을 현금으로 변환
  await updateRankBoard(); //랭킹 업데이트
  await deleteCompany(); //회사 삭제
  await updateMMR(); //MMR 업데이트
  await sendMatchingServerGameEnd();
  sendNoticesToAllClients('다음 게임은 6분뒤에 시작됩니다!'); //다음 게임 시작 알림
  await waitForMinuteRemainder(7); //7분까지 기다림
  const noticeInterval2 = setInterval(notifyTimeRemaining2, 15000);
  // 다음 게임까지 남은 시간 공지 (3000초)
  await new Promise((resolve) =>
    setTimeout(() => {
      clearInterval(noticeInterval2);
      resolve();
    }, 290000)
  );
}
export { gameTotal };
