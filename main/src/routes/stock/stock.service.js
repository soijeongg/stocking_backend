export class StockService {
    constructor(stockrepository){
        this.stockrepository = stockrepository;
    }


    /**
   * 사용자의 주식 정보를 가져오는 메소드
   * @param {number} userId - 사용자 ID
   * @returns {Promise<object>} 사용자의 주식 정보를 반환하는 프로미스
   */
    getStock = async (userId) => {
        const stocks = await this.stockrepository.findStockByUserId(userId);
        return stocks;
    }
}