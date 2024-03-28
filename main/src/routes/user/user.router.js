import { prisma } from '../../utils/prisma/index.js';
import express from 'express';
import passport from 'passport';
import isNotLogin from '../../middlewares/checkLoginMiddleware.js';
import { userController } from './user.controller.js';
import { userRepository } from './user.repository.js';
import { userService } from './user.service.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
let router = express.Router();

const UserRepository = new userRepository(prisma);
const UserService = new userService(UserRepository);
const UserController = new userController(UserService);

router.post('/sign-up', UserController.signupController);

router.post('/login', isNotLogin, (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    try {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info });
      } //여기로 넘어가 세션 req.session에 저장된다
      if (!user.isVerified) {
        return res.status(401).json({ message: '이메일 인증이 필요합니다' });
      }
      req.login(user, async (err) => {
        if (err) {
          return next(err);
        }

        return res.json({ message: `${user.nickname}님 환영합니다!~` });
      });
    } catch (err) {
      return next(err);
    }
  })(req, res, next);
});

router.delete('/logout', authMiddleware, (req, res, next) => {
  req.logOut(function (err) {
    if (err) {
      return next(err);
    }
    req.session.destroy();
    return res.json({ message: '로그아웃' });
  });
});
router.get('/userGet', authMiddleware, UserController.getUserController);
router.put('/user', authMiddleware, UserController.putLoginController);
router.delete('/user', authMiddleware, UserController.deleteUseController);
router.get('/verify', UserController.getVerifyController);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login' }), //? 그리고 passport 로그인 전략에 의해 googleStrategy로 가서 구글계정 정보와 DB를 비교해서 회원가입시키거나 로그인 처리하게 한다.
  (req, res) => {
    res.redirect('http://localhost:3000');
  }
);
router.get('/auth/naver', passport.authenticate('naver', { authType: 'reprompt' }));
router.get(
  '/auth/naver/callback',
  passport.authenticate('naver', { failureRedirect: 'http://localhost:3000/login' }), //? 그리고 passport 로그인 전략에 의해 googleStrategy로 가서 구글계정 정보와 DB를 비교해서 회원가입시키거나 로그인 처리하게 한다.
  (req, res) => {
    res.redirect('http://localhost:3000');
  }
);
router.get('/auth/kakao', passport.authenticate('kakao', { authType: 'reprompt' }));
router.get(
  '/auth/kakao/callback',
  passport.authenticate('kakao', { failureRedirect: 'http://localhost:3000/login' }), //? 그리고 passport 로그인 전략에 의해 googleStrategy로 가서 구글계정 정보와 DB를 비교해서 회원가입시키거나 로그인 처리하게 한다.
  (req, res) => {
    res.redirect('http://localhost:3000');
  }
);
export default router;
