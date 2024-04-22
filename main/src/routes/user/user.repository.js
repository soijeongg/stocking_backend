import argon2 from 'argon2';
import { sendVerificationEmail } from '../../utils/nodemailer/index.js';
import { sendToMatchingServer } from '../../utils/sendToMatchingServer/index.js';

export class userRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  //회원 가입을 해보자
  //1. 일단 아이디 체크를 해야 한다 들어온 이메일이 중복인지 확인하자

  checkemail = async (email) => {
    let checkEmail = await this.prisma.User.findFirst({
      where: { email: email },
    });
    return checkEmail;
  };

  createUser = async (email, password, nickname, token) => {
    let hashedPassword = await argon2.hash(password);
    let user = await this.prisma.User.create({
      data: { email, password: hashedPassword, nickname, token, isVerified: true, currentMoney: 10000000, tradableMoney: 10000000, initialSeed: 10000000 },
    });
    const jsonData = {
      reqType: `userCreate`,
      userId: user.userId,
    };
    const jsonDataString = JSON.stringify(jsonData);
    sendToMatchingServer(jsonDataString);
    return user;
  };

  //===================================개인의 모든 정보를 요청 한다 ================
  getUserInfo = async (userId) => {
    let findUser = await this.prisma.User.findFirst({
      where: { userId: userId },
    });
    return findUser;
  };
  //================================회원 정보 수정이 들어온다 비밀번호와 닉네임===========
  updateNickname = async (nickname, userId) => {
    let updateNick = await this.prisma.User.update({
      data: { nickname },
      where: { userId: +userId },
    });
    return updateNick;
  };

  updatePassword = async (password, userId) => {
    const hashedPassword = await argon2.hash(password);

    let updatedPassword = await this.prisma.User.update({
      data: { password: hashedPassword },
      where: { userId: +userId },
    });
    return updatedPassword;
  };
  /**
   *
   * @param {string} nickname 들어오는 유저의 닉네임
   * @param {string} password 해시화 되기 전 유저의 비밀번호
   * @returns
   */
  updateBoth = async (nickname, password, userId) => {
    let hashedPassword = await argon2.hash(password);
    let updatedBoth = await this.prisma.User.update({
      data: { nickname, password: hashedPassword },
      where: { userId: +userId },
    });
    return updatedBoth;
  };

  //======================================= 회원 탈퇴요청이 들어온다 ==============
  deleteUser = async (userId) => {
    let deleteOne = await this.prisma.User.delete({
      where: { userId: +userId },
    });
    return deleteOne;
  };

  //============================이메일 인증시 들어온 토큰이 맞는 토큰인지 찾는다============
  findToken = async (token, userId) => {
    return await this.prisma.User.findFirst({
      where: { token: token },
    });
  };
  //============================================만약 토큰이 있다면 이메일 인증 필드를 true로 바꾸자======
  updateStatus = async (userId) => {
    return await this.prisma.User.update({
      where: {
        userId: +userId,
      },
      data: { isVerified: true },
    });
  };

  //=======================================들어온 userId를 사용해 전채 정보를 보내준다====
  userinfo = async (userId) => {
    return await this.prisma.User.findMany({
      where: {
        userId: +userId,
      },
    });
  };
  //유저가 가지고 있는 주식의 회사명과 주식수를 보내준다.
  userStocks = async (userId) => {
    const stocks = await this.prisma.Stock.findMany({
      where: {
        userId: +userId,
      },
      select: {
        quantity: true,
        companyId: true,
      },
    });
    return stocks;
  };
  //회사의 id를 가지고 회사의 현재 주가를 보내준다
  getCompany = async (companyId) => {
    return await this.prisma.Company.findUnique({
      where: {
        companyId: +companyId,
      },
      select: {
        currentPrice: true,
      },
    });
  };
  updateTotalAsset(totalAsset, userId) {
    return this.prisma.User.update({
      where: {
        userId: +userId,
      },
      data: {
        totalAsset: BigInt(totalAsset),
      },
    });
  }
}
