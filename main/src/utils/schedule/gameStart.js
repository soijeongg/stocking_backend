import { prisma } from '../prisma/index.js';
import axios from 'axios';
const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // 모든 요청에 자동으로 쿠키를 포함시키도록 설정
});
/**
 * @description
 *기존의 회사들을 삭제합니다.
 */
async function resetCompany() {
  try {
    await prisma.company.deleteMany();
  } catch (error) {
    console.error('회사 정보를 삭제하는 동안 오류가 발생했습니다:', error);
  }
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
          initialSeed: BigInt(10000000),
          totalAsset: BigInt(10000000),
        },
      });
    }
  } catch (error) {
    console.error('사용자 잔액을 업데이트하는 동안 오류가 발생했습니다:', error);
  }
}

async function makeDummyUserAndCompany() {
  try {
    await prisma.user.deleteMany({
      where: {
        nickname: 'dummy',
      },
    });
    // 사용자와 회사 정보를 생성
    await axiosInstance.post('/api/sign-up', {
      email: 'dummy@naver.com',
      nickname: 'dummy',
      password: 'dummy',
    });
    const dummyUser = await prisma.user.findFirst({
      where: {
        email: 'dummy@naver.com',
      },
    });
    await prisma.user.update({
      where: {
        userId: +dummyUser.userId,
      },
      data: {
        currentMoney: BigInt(10000000000),
        initialSeed: BigInt(10000000000),
        totalAsset: BigInt(10000000000),
        isVerified: true,
      },
    });
    const companies = ['항해 전자', '항해 자동차', '항해 화학'];
    const companyPrices = [300000, 500000, 1000000];
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

async function makeDummyOrderAndStock() {
  try {
    const dummyUser = await prisma.user.findFirst({
      where: {
        nickname: 'dummy',
      },
    });
    const companies = await prisma.company.findMany();

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
          averagePrice: currentPrice * 10000,
        },
      });
    }
  } catch (err) {
    console.error('더미 주문을 생성하는 동안 오류가 발생했습니다:', err);
  }
}

async function gameStart() {
  await resetCompany();
  await makeDummyUserAndCompany();
  await makeDummyOrderAndStock();
}

export default gameStart;
