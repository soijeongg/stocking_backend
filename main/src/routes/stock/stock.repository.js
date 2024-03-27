export class StockRepository {
    constructor(prisma) {
      this.prisma = prisma;
    }


      /**
   * 사용자의 ID로 주식을 조회하는 메소드
   * @param {number} userId - 사용자 ID
   * @returns {Promise<object[]>} 사용자의 주식 목록을 반환하는 프로미스
   */
    findStockByUserId = async (userId) => {
      const stocks = await this.prisma.stock.findMany({
        where: {
          userId: +userId,
        },
      });
      if (stocks.length === 0) {
        return { message: '보유하신 주식이 없습니다' };
      }

      return stocks;
    };
  }