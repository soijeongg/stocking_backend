import { prisma } from '../../utils/prisma/index.js';
import { prismaReplica } from '../../utils/prisma/index.js';
import express from 'express';
import passport from 'passport';
import isNotLogin from '../../middlewares/checkLoginMiddleware.js';
import { userController } from './user.controller.js';
import { userRepository } from './user.repository.js';
import { userService } from './user.service.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { sendNoticesToClient } from '../../utils/socketConnecter/socketConnecter.js';
let router = express.Router();

const UserRepository = new userRepository(prisma, prismaReplica);
const UserService = new userService(UserRepository);
const UserController = new userController(UserService);

router.post('/sign-up', UserController.signupController);

router.post('/idcheck', UserController.idCheckController);

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
        return res.status(401).json({ message: info });
      }
      const existingSessionId = await new Promise((resolve, reject) => {
        req.sessionStore.get(`user_${user.userId}`, (err, session) => {
          if (err) reject(err);
          resolve(session);
        });
      });

      if (existingSessionId) {
        // 이전 사용자에게 로그아웃 알림 전송

        sendNoticesToClient(user.userId, ['다른 장치에서 로그인되었습니다. 자동으로 로그아웃됩니다.']);

        // 레디스에서 이전 세션 삭제
        await new Promise((resolve, reject) => {
          req.sessionStore.destroy(existingSessionId, (err) => {
            if (err) reject(err);
            resolve();
          });
        });
      }
      req.login(user, async (err) => {
        if (err) {
          return next(err);
        }
        await new Promise((resolve, reject) => {
          req.sessionStore.set(`user_${user.userId}`, req.sessionID, (err) => {
            if (err) reject(err);
            resolve();
          });
        });

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
router.get('/nickname', authMiddleware, UserController.getUserSimpleController);
router.put('/user', authMiddleware, UserController.putLoginController);
router.delete('/user', authMiddleware, UserController.deleteUserController);
router.get('/verify', UserController.getVerifyController);
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', async (err, user, info) => {
    if (err) {
      // 일반 에러 처리
      return res.status(500).json({ error: '인증 과정에서 시스템 에러가 발생했습니다.' });
    }
    if (!user) {
      // 사용자 인증 실패 처리
      if (info && info.message === '이 이메일은 이미 가입되어 있습니다 다른 메일을 이용하시거나 원래 사용하셨던 방식으로 로그인해주세요.') {
        // 특정 에러 메시지에 대한 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=emailAlreadyExists`);
      } else {
        // 다른 유형의 인증 실패 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=error`);
      }
    }
    const existingSessionId = await new Promise((resolve, reject) => {
      req.sessionStore.get(`user_${user.userId}`, (err, session) => {
        if (err) reject(err);
        resolve(session);
      });
    });

    if (existingSessionId) {
      // 이전 사용자에게 로그아웃 알림 전송

      sendNoticesToClient(user.userId, ['다른 장치에서 로그인되었습니다. 자동으로 로그아웃됩니다.']);

      // 레디스에서 이전 세션 삭제
      await new Promise((resolve, reject) => {
        req.sessionStore.destroy(existingSessionId, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }
    req.logIn(user, async (loginErr) => {
      if (loginErr) {
        // 로그인 프로세스 에러 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=error`);
      }
      // Redis에 사용자 ID와 세션 ID를 저장
      await new Promise((resolve, reject) => {
        req.sessionStore.set(`user_${user.id}`, req.sessionID, (err) => {
          if (err) reject(err);
          resolve();
        });
      });

      // 로그인 성공, 사용자를 홈페이지로 리디렉션
      return res.redirect(`${process.env.FRONTEND_URL}`);
    });
  })(req, res, next);
});
router.get('/auth/naver', passport.authenticate('naver', { authType: 'reprompt' }));
router.get('/auth/naver/callback', (req, res, next) => {
  passport.authenticate('naver', async (err, user, info) => {
    if (err) {
      // 일반 에러 처리
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=error`);
    }
    if (!user) {
      // 사용자 인증 실패 처리
      if (info && info.message === '이 이메일은 이미 가입되어 있습니다 다른 메일을 이용하시거나 원래 사용하셨던 방식으로 로그인해주세요.') {
        // 특정 에러 메시지에 대한 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=emailAlreadyExists`);
      } else {
        // 다른 유형의 인증 실패 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=error`);
      }
    }
    const existingSessionId = await new Promise((resolve, reject) => {
      req.sessionStore.get(`user_${user.userId}`, (err, session) => {
        if (err) reject(err);
        resolve(session);
      });
    });

    if (existingSessionId) {
      // 이전 사용자에게 로그아웃 알림 전송

      sendNoticesToClient(user.userId, ['다른 장치에서 로그인되었습니다. 자동으로 로그아웃됩니다.']);

      // 레디스에서 이전 세션 삭제
      await new Promise((resolve, reject) => {
        req.sessionStore.destroy(existingSessionId, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }

    req.logIn(user, async (loginErr) => {
      if (loginErr) {
        // 로그인 프로세스 에러 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=error`);
      }
      // Redis에 사용자 ID와 세션 ID를 저장
      await new Promise((resolve, reject) => {
        req.sessionStore.set(`user_${user.id}`, req.sessionID, (err) => {
          if (err) reject(err);
          resolve();
        });
      });

      // 로그인 성공, 사용자를 홈페이지로 리디렉션
      return res.redirect(`${process.env.FRONTEND_URL}`);
    });
  })(req, res, next);
});
router.get('/auth/kakao', passport.authenticate('kakao', { authType: 'reprompt' }));
router.get('/auth/kakao/callback', (req, res, next) => {
  passport.authenticate('kakao', async (err, user, info) => {
    if (err) {
      // 일반 에러 처리
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=error`);
    }
    if (!user) {
      // 사용자 인증 실패 처리
      if (info && info.message === '이 이메일은 이미 가입되어 있습니다 다른 메일을 이용하시거나 원래 사용하셨던 방식으로 로그인해주세요.') {
        // 특정 에러 메시지에 대한 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=emailAlreadyExists`);
      } else {
        // 다른 유형의 인증 실패 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=error`);
      }
    }
    const existingSessionId = await new Promise((resolve, reject) => {
      req.sessionStore.get(`user_${user.userId}`, (err, session) => {
        if (err) reject(err);
        resolve(session);
      });
    });

    if (existingSessionId) {
      // 이전 사용자에게 로그아웃 알림 전송

      sendNoticesToClient(user.userId, ['다른 장치에서 로그인되었습니다. 자동으로 로그아웃됩니다.']);

      // 레디스에서 이전 세션 삭제
      await new Promise((resolve, reject) => {
        req.sessionStore.destroy(existingSessionId, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }

    req.logIn(user, async (loginErr) => {
      if (loginErr) {
        // 로그인 프로세스 에러 처리
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=error`);
      }
      // Redis에 사용자 ID와 세션 ID를 저장
      await new Promise((resolve, reject) => {
        req.sessionStore.set(`user_${user.id}`, req.sessionID, (err) => {
          if (err) reject(err);
          resolve();
        });
      });

      // 로그인 성공, 사용자를 홈페이지로 리디렉션
      return res.redirect(`${process.env.FRONTEND_URL}`);
    });
  })(req, res, next);
});
export default router;
