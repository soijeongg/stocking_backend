export class StockController {
    constructor(stockservice){
        this.stockservice = stockservice;
    }

    /**
   * 사용자의 주식 정보를 가져오는 메소드
   * @param {Request} req - 요청 객체
   * @param {Response} res - 응답 객체
   * @param {NextFunction} next - 다음 미들웨어 함수
   * @returns {Promise<void>} 주식 정보를 반환하는 프로미스
   */
    getStock = async (req, res, next) => {
        try{
            const userId = res.locals.user.userId;
    
            const userStock = await this.stockservice.getStock(userId);
            res.status(200).json(userStock);
        }catch(err){
            next(err)
        }
    }
}