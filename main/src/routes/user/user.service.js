import crypto from 'crypto';
import { cur } from '../../utils/companyInfo/index.js';
export class userService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }
  generateRandomPassword() {
    return crypto.randomBytes(20).toString('hex');
  }
  //일단 회원가입을 하자  들어오는 것은 이메일 비밀번호 닉네임
  createUserService = async (email, password, nickname) => {
    //일단 이메일 검사를 하자 한번 더 하는 이유는 혹시 몰라서
    let checkEmailService = await this.userRepository.checkemail(email);
    if (checkEmailService) {
      const error = new Error('이미 등록된 이메일입니다');
      error.status = 401;
      throw error;
    }
    //없다면 회원가입을 시도한다
    let token = this.generateRandomPassword();
    let createUserOne = await this.userRepository.createUser(email, password, nickname, token);
    //return 값이 있다면 잘 메일이 보내지고 생성이 된것 없다면 안된것
    if (!createUserOne) {
      const error = new Error('회원가입에 실패했습니다 다시 시도해주세요');
      error.status = 401;
      throw error;
    }
    return createUserOne;
  };

  //이메일 중복체크를 해보자
  checkEmailService = async (email) => {
    let checkdEmail = await this.userRepository.checkemail(email);
    if (!checkdEmail) {
      const error = new Error('이미 등록된 이메일 입니다');
      error.status = 401;
      throw error;
    }
  };
  //로그인은 passport에서 처리 회원정보 수정을 해보자
  changeUserNickname = async (nickname, userId) => {
    //닉네임만 있다면
    let changeNickname = await this.userRepository.updateNickname(nickname, userId);
    if (!changeNickname) {
      const error = new Error('수정에 실패했습니다');
      throw error;
    }
    return changeNickname;
  };
  changeUserPassword = async (password, userId) => {
    console.log('2');
    let changePassword = await this.userRepository.updatePassword(password, userId);
    console.log('3');
    if (!changePassword) {
      const error = new Error('수정에 실패했습니다');
      throw error;
    }
    return changePassword;
  };

  changeUserNicknamePassword = async (nickname, password, userId) => {
    let changeBoth = await this.userRepository.updateBoth(nickname, password, userId);
    if (!changeBoth) {
      const error = new Error('수정에 실패했습니다');
      throw error;
    }
  };
  //===============================회원삭제를 시도한다=======================
  deleteUserService = async (userId) => {
    let deleteuser = await this.userRepository.deleteUser(userId);
    if (!deleteuser) {
      const error = new Error('삭제에 실패했습니다');
      throw error;
    }
    return deleteuser;
  };
  //====================================이메일 인증==================
  verifyUserEmail = async (token) => {
    let findUser = await this.userRepository.findToken(token);
    if (!findUser) {
      const error = new Error('만료되었거나 없는 토큰 입니다');
      throw error;
    }
    let checkEmail = await this.userRepository.updateStatus(findUser.userId);
    return checkEmail;
  };
  // 전체 정보를 내보내는 것
  selectUserInfo = async (userId) => {
    let userInfoService = await this.userRepository.userinfo(userId);
    if (!userInfoService) {
      const error = new Error('회원 정보조회에 실패했습니다');
      error.status = 401;
      throw error;
    }
    //유저가 가지고 있는 주식을 조회한다
    let stocks = await this.userRepository.userStocks(userId);
    //유저의 총자산을 계산한다
    let totalAsset = userInfoService[0].currentMoney;
    if (stocks) {
      stocks.forEach((stock) => {
        totalAsset += BigInt(cur[stock.Company.name]) * BigInt(stock.quantity);
      });
    }
    //유저의 총자산을 업데이트한다
    userInfoService[0].totalAsset = totalAsset;

    return userInfoService;
  };
}
