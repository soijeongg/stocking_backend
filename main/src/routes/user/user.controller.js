import { emailSchema, passwordSchema, nicknameSchema } from './user.joi.js';

export class userController {
  constructor(userService) {
    this.userService = userService;
  }
  //회원가입 하러 들어온다
  signupController = async (req, res, next) => {
    try {
      let { email, password, nickname } = req.body;
      let emailvalidation = emailSchema.validate({ email });
      if (emailvalidation.error) {
        const error = new Error('이메일에는 이메일 형식만 입력해주세요');
        error.status = 404;
        throw error;
      }
      let passwordvalidation = passwordSchema.validate({ password });
      if (passwordvalidation.error) {
        const error = new Error('비밀번호는 5자 이상 15자 이내 닉네임이 들어가 있지 않게 만들어주세요');
        error.status = 404;
        throw error;
      }
      let nicknamevalidation = nicknameSchema.validate({ nickname });
      if (nicknamevalidation.error) {
        const error = new Error('닉네임은 2자 이상 20자 이내로 입력해주세요');
        error.status = 404;
        throw error;
      }
      let signup = await this.userService.createUserService(email, password, nickname);
      if (!signup) {
        const error = new Error('회원가입에 실패했습니다 ');
        throw error;
      }
      return res.status(200).json({ message: `${nickname}님 환영합니다` });
    } catch (error) {
      next(error);
    }
  };

  //아이디체크하러 들어온다
  idCheckController = async (req, res, next) => {
    try {
      let { email } = req.body;
      let emailvalidation = emailSchema.validate({ email });
      if (emailvalidation.error) {
        const error = new Error('이메일에는 이메일 형식만 입력해주세요');
        error.status = 404;
        throw error;
      }
      await this.userService.checkEmailService(email);
      return res.status(200).json({ message: '중복되지 않는 이메일 입니다' });
    } catch (error) {
      next(error);
    }
  };
  // 회원 데이터를 수정하러 들어온다============================================
  putLoginController = async (req, res, next) => {
    try {
      let { password, nickname } = req.body;
      // 비밀번호와 닉네임에 대한 유효성 검사는 email 필드가 존재할 때만 진행됩니다.
      if (password) {
        let passwordValidation = passwordSchema.validate({ password });
        if (passwordValidation.error) {
          const error = new Error('비밀번호는 5자 이상 15자 이내이며, 특수 문자나 공백이 없어야 합니다');
          error.status = 400;
          throw error;
        }
      }

      if (nickname) {
        let nicknameValidation = nicknameSchema.validate({ nickname });
        if (nicknameValidation.error) {
          const error = new Error('닉네임은 2자 이상 20자 이내이어야 합니다');
          error.status = 400;
          throw error;
        }
      }

      let { userId } = res.locals.user;
      if (nickname && password) {
        await this.userService.changeUserNicknamePassword(nickname, password, userId);
        return res.status(200).json({ message: '성공적으로 수정했습니다' });
      }
      if (!nickname && password) {
        // console.log('1');
        await this.userService.changeUserPassword(password, userId);
        // console.log('4');
        return res.status(200).json({ message: '성공적으로 수정했습니다' });
      }
      if (nickname && !password) {
        await this.userService.changeUserNickname(nickname, userId);
        return res.status(200).json({ message: '성공적으로 수정했습니다' });
      }
    } catch (error) {
      next(error);
    }
  };
  //회원 탈퇴를 해보자
  deleteUseController = async (req, res, next) => {
    let { userId } = res.locals.user;
    let deleteOne = await this.userService.deleteUserService(userId);
    return res.status(200).json({ message: '성공적으로 삭제 되었습니다' });
  };
  //회원 정보조회를 해보자
  getUserController = async (req, res, next) => {
    let { userId } = res.locals.user;
    let getOne = await this.userService.selectUserInfo(userId);
    const processedUsers = getOne.map((user) => ({
      nickname: user.nickname,
      currentMoney: user.currentMoney.toString(),
      totalAsset: user.totalAsset.toString(),
      initialSeed: user.initialSeed.toString(),
      tier: user.tier,
    }));
    return res.status(200).json({ data: processedUsers });
  };
  //회원의 닉네임을 받아오자.
  getUserSimpleController = async (req, res, next) => {
    let { userId } = res.locals.user;
    let getOne = await this.userService.selectUserSimpleInfo(userId);
    const processedUsers = getOne.map((user) => ({
      nickname: user.nickname,
    }));
    return res.status(200).json(processedUsers);
  };
  //이메일 인증 컨트롤러를 만든다 .
  getVerifyController = async (req, res, next) => {
    try {
      const { token } = req.query;
      const result = await this.userService.verifyUserEmail(token);

      if (!result) {
        return res.status(400).send('유효하지 않은 토큰입니다.');
      }
      //res.send('<h1>인증완료 </h1>');
      return res.send(`<h1>인증완료 </h1> <a href=${process.env.BACKEND_URL}">메인페이지로 가기</a>`);
    } catch (error) {
      next(error);
    }
  };
}
