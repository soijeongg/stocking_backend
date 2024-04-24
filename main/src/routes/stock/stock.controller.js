// StockController 클래스는 사용자의 주식 정보 처리를 담당합니다.
export class StockController {
  constructor(stockservice) {
    this.stockservice = stockservice;
  }

  // 사용자의 주식 정보를 조회합니다.
  getStock = async (req, res, next) => {
    try {
      const userId = res.locals.user.userId;
      const userStock = await this.stockservice.getStock(userId);
      res.status(200).json(userStock);
    } catch (err) {
      next(err);
    }
  };
}
