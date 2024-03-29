export class GetStockRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  filterData = async (name, type, order, isSold) => {
    // 주문을 가져올 변수
    let stocks;
    if (order === '오름차순') {
      //1차필터링
      stocks = await this.prisma.order.findMany({
        include: {
          Company: true,
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });
    } else if (order === '내림차순') {
      stocks = await this.prisma.order.findMany({
        include: {
          Company: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    } else {
      stocks = await this.prisma.order.findMany({
        include: {
          Company: true,
        },
      });
    }

    // 2차 필터링
    const filteredStocks = stocks.filter((item) => {
      const companyName = item.Company.name;

      // 회사이름검색
      if (name && companyName !== name) {
        return false;
      }
      // 타입검색
      if (type && item.type !== type) {
        return false;
      }
      // isSold 검색
      if (isSold && isSold !== 'false') {
        return false;
      }
      if (isSold && item.isSold.toString() !== isSold) {
        return false;
      }
      return true;
    });

    return filteredStocks;
  };
}
