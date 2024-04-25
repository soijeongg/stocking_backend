// CompanyRepository 클래스는 데이터베이스에서 회사 관련 데이터를 직접 조회합니다.
export class CompanyRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // 모든 회사의 데이터를 조회합니다.
  getCompanies = async () => {
    const companies = await this.prisma.company.findMany();
    return companies;
  };

  // 특정 회사의 이름을 조회합니다.
  getCompanyName = async (companyId) => {
    let name = await this.prisma.company.findMany({
      select: { name: true },
      where: { companyId: +companyId },
    });
    return name;
  };
}
