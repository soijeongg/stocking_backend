export class ConcludedController {
  /**
   * ConcludedController의 생성자.
   * @param {Object} concludedService - Concluded 관련 서비스 인스턴스.
   */
  constructor(concludedService) {
    this.concludedService = concludedService;
  }

  /**
   * 사용자의 Concluded 데이터를 조회하여 반환합니다.
   * GET 요청에서 query 파라미터로 name, type, order를 받아 처리합니다.
   * @param {Object} req - Express의 request 객체.
   * @param {Object} res - Express의 response 객체.
   * @param {Function} next - Express의 next 미들웨어 함수.
   * @returns {Promise<void>} - 비동기 처리를 위한 Promise 반환.
   */
  getConcluded = async (req, res, next) => {
    // 요청에서 필요한 데이터를 추출합니다.
    const { name, type, order } = req.query;
    const { userId } = res.locals.user;

    try {
      // concludedService를 사용하여 데이터를 조회합니다.
      const result = await this.concludedService.getConcluded(userId, name, type, order);
      // 성공적으로 데이터를 조회하면 상태 코드 200과 함께 결과를 JSON 형태로 응답합니다.
      res.status(200).json(result);
    } catch (error) {
      // 에러 발생 시 next를 호출하여 에러를 처리합니다.
      next(error);
    }
  };
}
