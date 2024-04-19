import { prisma } from '../prisma/index.js';
import crypto from 'crypto';
import argon2 from 'argon2';
import { sendToMatchingServer } from '../sendToMatchingServer/index.js';

/**
 * @description
 * 길이가 length인 랜덤 문자열을 생성합니다.
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
 * @description
 * 모든 사용자의 잔액을 1000만 원으로 재설정합니다.
 */
async function resetUserMoney() {
  try {
    // 데이터베이스에서 모든 사용자를 가져옴
    const users = await prisma.user.findMany();

    // 각 사용자의 잔액에 1000만 원을 추가하기 위해 각 사용자에 대해 반복
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
 * @description
 * 더미 사용자를 생성합니다.
 */
async function createDummyUser() {
  try {
    let hashedPassword = await argon2.hash('dummy');
    let email = (await generateRandomString(10)) + '@naver.com';
    // 더미 사용자 생성
    await prisma.user.create({
      data: {
        email,
        nickname: 'dummy',
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
 * @description
 * 더미 회사를 생성합니다.
 */
async function createCompany() {
  try {
    // 회사 이름과 현재가격을 배열로 저장
    const companies = ['항해 전자', '항해 자동차', '항해 화학'];
    const companyPrices = [300000, 500000, 1000000];
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
 * @description
 * 더미 주문과 주식을 생성합니다.
 */
async function createDummyOrderAndStock() {
  try {
    const dummyUsers = await prisma.user.findMany({
      where: {
        dummy: true,
      },
    });
    const companies = await prisma.company.findMany();
    for (let dummyUser of dummyUsers) {
      for (let company of companies) {
        let currentPrice = company.currentPrice;
        currentPrice /= 10000;
        let maxOrder = Math.round(1000 / currentPrice);
        for (let i = currentPrice / 2; i < currentPrice; ++i) {
          //1부터 10까지 랜덤으로된 숫자 생성
          let random = Math.floor(Math.random() * maxOrder) + 1;
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
        await prisma.stock.create({
          data: {
            userId: +dummyUser.userId,
            companyId: +company.companyId,
            quantity: 1000000,
            tradableQuantity: 1000000,
            averagePrice: currentPrice * 10000,
          },
        });
      }
    }
  } catch (err) {
    console.error('더미 주문을 생성하는 동안 오류가 발생했습니다:', err);
  }
}
async function sendMatchingServerGameStart() {
  const jsonData = {
    reqType: 'gameCreate',
  };
  const jsonDataString = JSON.stringify(jsonData);
  sendToMatchingServer(jsonDataString);
}

export { resetUserMoney, createDummyUser, createCompany, createDummyOrderAndStock, sendMatchingServerGameStart };
