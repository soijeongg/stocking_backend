export class StockService {
  constructor(stockrepository) {
    this.stockrepository = stockrepository;
  }

  /**
   * 사용자의 주식 정보를 가져오는 메소드
   * @param {number} userId - 사용자 ID
   * @returns {Promise<object>} 사용자의 주식 정보를 반환하는 프로미스
   */
  getStock = async (userId) => {
    const stocks = await this.stockrepository.findStockByUserId(userId);
    stocks.sort((a, b) => {
      const profitA = (a.Company.currentPrice - a.averagePrice) / a.averagePrice;
      const profitB = (b.Company.currentPrice - b.averagePrice) / b.averagePrice;
      return profitB - profitA; // 내림차순 정렬
    });

    return stocks;
  };
}
