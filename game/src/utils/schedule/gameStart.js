import { prisma } from '../prisma/index.js';
import crypto from 'crypto';
import argon2 from 'argon2';
import { sendToMatchingServer } from '../sendToMatchingServer/index.js';

/**
 * @description 지정된 길이의 무작위 소문자 알파벳 문자열을 생성합니다. 이 함수는 주어진 길이에 따라
 * 'abcdefghijklmnopqrstuvwxyz'에서 무작위로 문자를 선택하여 문자열을 구성합니다.
 * @param {number} length - 생성할 문자열의 길이.
 * @returns {Promise<string>} 생성된 무작위 문자열을 반환합니다.
 */
async function generateRandomString(length) {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * @description 지정된 최소값과 최대값 사이의 랜덤 정수를 반환합니다. 이 함수는 주어진 범위 내에서 균등하게 분포된 랜덤한 정수를 생성하는 데 사용됩니다.
 * @param {number} min - 생성할 랜덤 숫자의 최소값.
 * @param {number} max - 생성할 랜덤 숫자의 최대값.
 * @returns {number} min과 max 사이의 랜덤 정수.
 */
function getRandomPrice(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * @description 데이터베이스에 저장된 모든 사용자의 보유 금액을 초기화
 * 각 사용자의 'currentMoney', 'tradableMoney', 'initialSeed', 'totalAsset' 필드를 모두 1000만 원으로 설정
 * 이 작업은 모든 사용자에 대해 동일하게 적용됩니다.
 * @returns {Promise<void>} 모든 사용자 데이터의 업데이트 작업을 완료한 후 Promise를 반환
 * @throws {Error} 데이터베이스 업데이트 중 오류가 발생할 경우, 오류 메시지를 콘솔에 출력
 */
async function resetUserMoney() {
  try {
    // 데이터베이스에서 모든 사용자를 가져옴
    const users = await prisma.user.findMany();
    // 모든 사용자의 잔액에 1000만 원을 추가
    for (const user of users) {
      await prisma.user.update({
        where: {
          userId: +user.userId, // 각 사용자의 id로 업데이트 대상을 지정
        },
        data: {
          currentMoney: BigInt(10000000),
          tradableMoney: BigInt(10000000),
          initialSeed: BigInt(10000000),
          totalAsset: BigInt(10000000),
        },
      });
    }
  } catch (error) {
    console.error('사용자 잔액을 업데이트하는 동안 오류가 발생했습니다:', error);
  }
}
/**
 * @description 더미 사용자를 생성하고 데이터베이스에 저장
 * 이 사용자는 검증된 상태로 생성되며, 모든 금융 필드는 100억으로 설정
 * @returns {Promise<void>} 더미 사용자 생성 작업을 완료한 후 해결되는 Promise.
 * @throws {Error} 사용자 생성 중 데이터베이스 작업에 오류가 발생하면 콘솔에 오류 메시지를 출력합니다.
 */
async function createDummyUser() {
  try {
    let randomString = await generateRandomString(10);
    let hashedPassword = await argon2.hash(randomString);
    let email = (await generateRandomString(10)) + '@naver.com';
    // 더미 사용자 생성
    await prisma.user.create({
      data: {
        email,
        nickname: '익명의 유저',
        password: hashedPassword,
        token: crypto.randomBytes(20).toString('hex'),
        currentMoney: BigInt(10000000000),
        tradableMoney: BigInt(10000000000),
        initialSeed: BigInt(10000000000),
        totalAsset: BigInt(10000000000),
        isVerified: true,
        dummy: true,
      },
    });
  } catch (err) {
    console.error('더미 사용자를 생성하는 동안 오류가 발생했습니다:', err);
  }
}
/**
 * @description 세 개의 더미 회사를 생성하고 데이터베이스에 저장합니다. 각 회사의 이름과 가격은 사전에 정의된 배열을 사용하여 생성
 * 가격은 지정된 범위 내에서 랜덤하게 결정되며, 이 랜덤한 가격은 회사의 현재 가격과 초기 가격으로 설정
 * @returns {Promise<void>} 데이터베이스에 회사 생성 작업을 완료한 후 해결되는 Promise.
 * @throws {Error} 데이터베이스 작업 중 발생하는 오류를 콘솔에 출력합니다.
 */
async function createCompany() {
  try {
    // 회사 이름과 현재가격을 배열로 저장
    const companies = ['항해 전자', '항해 자동차', '항해 화학'];
    const companyPrices = [];
    for (let i = 0; i < 3; i++) {
      companyPrices.push(getRandomPrice(10, 50) * 10000);
    }
    // 더미 회사 생성
    for (let i = 0; i < companies.length; i++) {
      await prisma.company.create({
        data: {
          name: companies[i],
          currentPrice: companyPrices[i],
          initialPrice: companyPrices[i],
        },
      });
    }
  } catch (error) {
    console.error('더미 사용자 및 회사 정보를 생성하는 동안 오류가 발생했습니다:', error);
  }
}
/**
 * @description 더미 사용자와 회사를 대상으로 더미 주문 및 주식을 생성
 * 각 더미 사용자에 대해 모든 회사의 주식에 대한 구매 및 판매 주문을 생성하며, 각 주문의 수량은 현재 가격에 따라 랜덤으로 결정
 * 또한, 각 회사에 대한 주식도 생성하여 게임 중간 이벤트에 대비
 * @returns {Promise<void>} 모든 더미 주문과 주식의 생성 작업을 완료한 후 해결되는 Promise.
 * @throws {Error} 데이터베이스 작업 중 발생하는 오류를 콘솔에 출력
 */
async function createDummyOrderAndStock() {
  try {
    // 더미 사용자의 정보를 가져옴
    const dummyUsers = await prisma.user.findMany({
      where: {
        dummy: true,
      },
    });
    // 모든 회사의 정보를 가져옴
    const companies = await prisma.company.findMany();
    // 더미 사용자와 회사에 대한 더미 주문 생성
    for (let dummyUser of dummyUsers) {
      for (let company of companies) {
        let currentPrice = company.currentPrice;
        currentPrice /= 10000;
        // 최대 주문량을 현재 가격을 기준으로 설정
        // 계수는 테스트시에는 1000, 배포시에는 1
        let maxOrder = Math.round(1000 / currentPrice);
        for (let i = Math.floor(currentPrice) / 2; i < currentPrice; ++i) {
          let random = Math.floor(Math.random() * maxOrder) + 1;
          // 더미 매수 주문 생성
          await prisma.order.create({
            data: {
              userId: +dummyUser.userId,
              companyId: +company.companyId,
              quantity: random,
              price: i * 10000,
              type: 'buy',
            },
          });
        }
        for (let i = currentPrice; i <= (3 * currentPrice) / 2; ++i) {
          let random = Math.floor(Math.random() * maxOrder) + 1;
          // 더미 매도 주문 생성
          await prisma.order.create({
            data: {
              userId: +dummyUser.userId,
              companyId: +company.companyId,
              quantity: random,
              price: i * 10000,
              type: 'sell',
            },
          });
        }
        // 더미 주식 생성
        await prisma.stock.create({
          data: {
            userId: +dummyUser.userId,
            companyId: +company.companyId,
            quantity: 1000000,
            tradableQuantity: 1000000,
            averagePrice: currentPrice,
          },
        });
      }
    }
  } catch (err) {
    console.error('더미 주문을 생성하는 동안 오류가 발생했습니다:', err);
  }
}
/**
 * @description 매칭 서버에 게임 시작 요청을 전송, 이 함수는 게임의 생성을 서버에 요청
 * 'gameCreate' 요청 유형을 포함한 JSON 데이터를 매칭 서버로 전송
 * 이를 받은 매칭 서버는 레디스 데이터베이스를 초기화함
 * @returns {Promise<void>} 서버로의 요청 전송이 완료된 후 promise를 반환
 */
async function sendMatchingServerGameStart() {
  const jsonData = {
    reqType: 'gameCreate',
  };
  const jsonDataString = JSON.stringify(jsonData);
  sendToMatchingServer(jsonDataString);
}

export { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock, sendMatchingServerGameStart };
