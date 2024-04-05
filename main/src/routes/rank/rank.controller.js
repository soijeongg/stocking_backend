export class RankController {
  constructor(rankservice) {
    this.rankservice = rankservice;
  }

  /**
   * 사용자 랭킹을 가져오는 메소드
   * @param {Request} req - 요청 객체
   * @param {Response} res - 응답 객체
   * @param {NextFunction} next - 다음 미들웨어 함수
   * @returns {Promise<void>} 랭킹을 반환하는 프로미스
   */
  getRanking = async (req, res, next) => {
    try {
      const allUsers = await this.rankservice.allUsers();
      return res.status(200).json(allUsers);
    } catch (err) {
      next(err);
    }
  };
  getmmrRanking = async (req, res, next) => {
    try {
      const allUsers = await this.rankservice.allmmrUsers();
      return res.status(200).json(allUsers);
    } catch (err) {
      next(err);
    }
  };
}
