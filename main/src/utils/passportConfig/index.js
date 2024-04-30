import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as NaverStrategy } from 'passport-naver-v2';
import argon2 from 'argon2';
import { prisma } from '../prisma/index.js';
import { prismaReplica } from '../prisma/index.js';
import crypto from 'crypto';

function generateRandomPassword() {
  return crypto.randomBytes(16).toString('hex');
}

// 사용자 정보를 세션에 저장
export default function passportConfig() {
  passport.serializeUser((user, done) => {
    done(null, user.userId);
  });
  //세션을 검사해 사용자 식별 후 req.user에 저장함
  passport.deserializeUser(async (userId, done) => {
    try {
      const user = await prismaReplica.User.findFirst({ where: { userId } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  passport.use(
    'local',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // 사용자 데이터베이스에서 이메일로 사용자 찾기
          const user = await prismaReplica.User.findFirst({ where: { email: email } });
          if (!user) {
            return done(null, false, { message: '유저를 찾을 수 없습니다.' });
          }
          // 비밀번호 확인
          const isValidPassword = await argon2.verify(user.password, password);
          if (!isValidPassword) {
            return done(null, false, { message: '비밀번호가 일치하지 않습니다.' });
          }
          if (!user.isVerified) {
            return done(null, false, { message: '이메일 인증이 필요합니다' });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_ID, // 구글 로그인에서 발급받은 REST API 키
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`, // 구글 로그인 Redirect URI 경로
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await prismaReplica.User.findFirst({
            where: { email: profile.emails[0].value },
          });

          if (user) {
            // 이메일이 이미 존재하는 경우
            if (user.provider === 'google') {
              // 동일한 제공자로부터 로그인 시도인 경우, 로그인 성공 처리
              return done(null, user);
            } else {
              // 다른 제공자를 통한 계정이 이미 존재하는 경우, 에러 처리
              return done(null, false, { message: '이 이메일은 이미 가입되어 있습니다 다른 메일을 이용하시거나 원래 사용하셨던 방식으로 로그인해주세요.' });
            }
          } else {
            const user = await prisma.User.create({
              data: {
                email: profile.emails[0].value,
                password: generateRandomPassword(), // 가상의 비밀번호 할당
                nickname: profile.displayName,
                provider: 'google', // 사용자가 Google을 통해 인증되었음을 나타내는 필드 추가
                isVerified: true,
                token: generateRandomPassword(),
              },
            });
            return done(null, user);
          }
        } catch (error) {
          console.error(error);
          done(error);
        }
      }
    )
  );

  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_ID, // 구글 로그인에서 발급받은 REST API 키=
        callbackURL: `${process.env.BACKEND_URL}/api/auth/kakao/callback`, // 구글 로그인 Redirect URI 경로
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile._json.kakao_account.email;
          const nickname = profile._json.properties.nickname;
          const user = await prismaReplica.User.findFirst({
            where: { email: email },
          });

          if (user) {
            // 이메일이 이미 존재하는 경우
            if (user.provider === 'kakao') {
              // 동일한 제공자로부터 로그인 시도인 경우, 로그인 성공 처리
              return done(null, user);
            } else {
              // 다른 제공자를 통한 계정이 이미 존재하는 경우, 에러 처리
              return done(null, false, { message: '이 이메일은 이미 가입되어 있습니다 다른 메일을 이용하시거나 원래 사용하셨던 방식으로 로그인해주세요.' });
            }
          } else {
            const user = await prisma.User.create({
              data: {
                email: email,
                password: generateRandomPassword(),
                nickname: nickname,
                provider: 'kakao',
                isVerified: true,
                token: generateRandomPassword(),
              },
            });
            done(null, user);
          }
        } catch (error) {
          console.error(error);
          done(error);
        }
      }
    )
  );
  passport.use(
    new NaverStrategy(
      {
        clientID: process.env.NAVER_ID, // 구글 로그인에서 발급받은 REST API 키
        clientSecret: process.env.NAVER_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/naver/callback`, // 구글 로그인 Redirect URI 경로
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await prismaReplica.User.findFirst({
            where: { email: profile.email },
          });

          if (user) {
            // 이메일이 이미 존재하는 경우
            if (user.provider === 'naver') {
              // 동일한 제공자로부터 로그인 시도인 경우, 로그인 성공 처리
              return done(null, user);
            } else {
              // 다른 제공자를 통한 계정이 이미 존재하는 경우, 에러 처리
              return done(null, false, { message: '이 이메일은 이미 가입되어 있습니다 다른 메일을 이용하시거나 원래 사용하셨던 방식으로 로그인해주세요.' });
            }
          } else {
            const user = await prisma.User.create({
              data: {
                email: profile.email,
                password: generateRandomPassword(), // 가상의 비밀번호 할당
                nickname: profile.name,
                provider: 'naver', // 사용자가 네이버 통해 인증되었음을 나타내는 필드 추가
                isVerified: true,
                token: generateRandomPassword(),
              },
            });
            return done(null, user);
          }
        } catch (error) {
          console.error(error);
          done(error);
        }
      }
    )
  );
}
