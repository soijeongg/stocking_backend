import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
//토큰에 사용할 20자의 난수 생성

const transporter = nodemailer.createTransport({
  service: 'naver',
  host: 'smtp.naver.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
});
//이메일의 내용을 정하는 함수
export const sendVerificationEmail = (userEmail, token) => {
  const mailOptions = {
    from: `${process.env.USER}@naver.com`,
    to: userEmail,
    subject: 'STOCKKING 회원가입 인증 이메일입니다',
    html: `<p>아래의 링크를 클릭하여 회원가입을 완료하세요.</p>
           <p><a href="http://localhost:3000/api/verify?token=${token}">회원가입 인증하기</a></p>`,
  };
  // 이메일을 보내는 함수
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`인증 이메일 발송: ${info.response}`);
    }
  });
  return 'sucess';
};
