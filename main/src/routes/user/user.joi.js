// 들어올 로그인에 대한 조이 아이디는 글자여야 한다 비밀번호는 글자여야 한다 닉네임도 글자여야 한다
import Joi from 'joi';

export const emailSchema = Joi.object({
  email: Joi.string().email().required(),
});
export const passwordSchema = Joi.object({
  password: Joi.string().min(5).max(15).invalid(Joi.ref('id')).alphanum().required(),
});
export const nicknameSchema = Joi.object({
  nickname: Joi.string().min(2).max(20).required(),
});
