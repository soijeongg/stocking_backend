// StockRepository 클래스는 데이터베이스에서 주식 관련 데이터를 직접 조회합니다.
export class StockRepository {
  constructor(prisma, prismaReplica) {
    this.prisma = prisma;
    this.prismaReplica = prismaReplica;
  }

  // 사용자의 ID를 기준으로 주식 데이터를 조회합니다.
  findStockByUserId = async (userId) => {
    const stocks = await this.prismaReplica.stock.findMany({
      where: {
        userId: +userId,
      },
      include: {
        Company: true,
      },
    });
    if (stocks.length === 0) {
      return { message: '보유하신 주식이 없습니다' };
    }

    return stocks;
  };
}
