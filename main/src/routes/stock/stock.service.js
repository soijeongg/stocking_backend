// StockService 클래스는 주식 데이터 관련 로직을 처리합니다.
export class StockService {
  constructor(stockrepository) {
    this.stockrepository = stockrepository;
  }

  // 사용자의 주식 정보를 조회하고, 수익률에 따라 내림차순으로 정렬하여 반환합니다.
  getStock = async (userId) => {
    const stocks = await this.stockrepository.findStockByUserId(userId);
    if (stocks.message) {
      return stocks;
    }
    stocks.sort((a, b) => {
      const profitA = (a.Company.currentPrice - a.averagePrice) / a.averagePrice;
      const profitB = (b.Company.currentPrice - b.averagePrice) / b.averagePrice;
      return profitB - profitA; // 내림차순 정렬
    });

    return stocks;
  };
}
