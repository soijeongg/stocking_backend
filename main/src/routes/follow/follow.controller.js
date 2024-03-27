import { companyIdSchema } from './follow.joi.js';

export class FollowController {
  constructor(followservice) {
    this.followservice = followservice;
  }

    /**
   * 회사를 팔로우(찜)하는 메소드
   * @param {Request} req - 요청 객체
   * @param {Response} res - 응답 객체
   * @param {NextFunction} next - 다음 미들웨어 함수
   * @returns {Promise<void>} 팔로우 결과를 응답하는 프로미스
   */
  followCompany = async (req, res, next) => {
    try {
      const {companyId} = req.params;
      const companyIdError = companyIdSchema.validate(req.params).errer;
      if (companyIdError) {
        const error = new Error('주소 형식이 올바르지 않습니다.');
        error.status = 400;
        throw error;
      }

      // 미들웨어를 통해 사용자 ID를 획득
      const userId = res.locals.user.userId;

      const follow = await this.followservice.followCompany(userId, companyId);
      return res.status(200).json(follow);
    } catch (err) {
      next(err);
    }
  };
}
