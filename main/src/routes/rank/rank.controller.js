export class RankController {
  constructor(rankservice) {
    this.rankservice = rankservice;
  }
  /**
   * @description 대회 수익률에 따른 순위를 조회하여 상위 5인의 유저 정보를 JSON 형식으로 반환합니다.
   * @param {import('express').Request} req - Express 프레임워크의 요청 객체
   * @param {import('express').Response} res - Express 프레임워크의 응답 객체
   * @param {import('express').NextFunction} next - 다음 미들웨어 함수를 실행하기 위한 콜백 함수
   * @returns {Promise<void>} HTTP 상태 코드 200과 함께 사용자 랭킹 데이터를 JSON 형식으로 응답합니다.
   * @throws {Error} 데이터베이스 조회 과정에서 오류가 발생할 경우 에러를 핸들링합니다.
   */
  getRanking = async (req, res, next) => {
    try {
      const allUsers = await this.rankservice.allUsers();
      return res.status(200).json(allUsers);
    } catch (err) {
      next(err);
    }
  };
  /**
   * @description MMR 등급에 따른 순위를 조회하여 상위 5인의 유저 정보를 JSON 형식으로 응답합니다.
   * @param {import('express').Request} req - Express 프레임워크의 요청 객체
   * @param {import('express').Response} res - Express 프레임워크의 응답 객체
   * @param {import('express').NextFunction} next - 다음 미들웨어 함수를 실행하기 위한 콜백 함수
   * @returns {Promise<void>} HTTP 상태 코드 200과 함께 사용자의 MMR 등급 순위 데이터를 JSON 형식으로 응답합니다.
   * @throws {Error} 데이터베이스 조회 과정에서 오류가 발생할 경우 에러를 핸들링합니다.
   */
  getmmrRanking = async (req, res, next) => {
    try {
      const allUsers = await this.rankservice.allmmrUsers();
      return res.status(200).json(allUsers);
    } catch (err) {
      next(err);
    }
  };
}
