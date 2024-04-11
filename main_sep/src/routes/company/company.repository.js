export class CompanyRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  getCompanies = async () => {
    const companies = await this.prisma.company.findMany();
    return companies;
  };

  getCompanyName = async (companyId) => {
    let name = await this.prisma.company.findMany({
      select: { name: true },
      where: { companyId: +companyId },
    });
    return name;
  };
}
