export class ConcludedRepository {
  constructor(prisma, prismaReplica) {
    this.prisma = prisma;
    this.prismaReplica = prismaReplica;
  }

  filterData = async (userId, name, type, order) => {
    // `orderBy` 설정
    const orderBy = order === '오름차순' ? 'asc' : order === '내림차순' ? 'desc' : undefined;

    // Prisma 쿼리 옵션 설정
    let queryOptions = {
      include: { Company: true },
      where: {
        userId: +userId, // 특정 사용자의 ID를 필터링 조건으로 추가
      },
    };
    if (orderBy) {
      queryOptions.orderBy = { createdAt: orderBy };
    }

    // 데이터베이스로부터 데이터를 조회
    let stocks = await this.prismaReplica.concluded.findMany(queryOptions);

    // 추가적인 필터링
    const filteredStocks = stocks.filter((item) => {
      const companyName = item.Company.name;
      if (name && !companyName.includes(name)) return false; // 변경된 부분
      if (type && item.type !== type) return false;
      return true;
    });

    return filteredStocks;
  };
}
