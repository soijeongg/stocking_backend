export class CompanyRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  getCompanies = async () => {
    const companies = await this.prisma.company.findMany();
    return companies;
  };
}
