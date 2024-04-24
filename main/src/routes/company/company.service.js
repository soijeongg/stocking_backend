// CompanyService 클래스는 회사 데이터 관련 로직을 처리합니다.
export class CompanyService {
  constructor(CompanyRepository) {
    this.CompanyRepository = CompanyRepository;
  }

  // 모든 회사의 정보를 조회하고, 등락률을 계산한 후 내림차순으로 정렬하여 반환합니다.
  getCompanies = async (userId, type) => {
    let companies = await this.CompanyRepository.getCompanies();
    if (companies.length === 0) {
      return companies;
    }
    companies.forEach((company) => {
      company.fluctuationRate = parseFloat(((100 * (company.currentPrice - company.initialPrice)) / company.initialPrice).toFixed(2));
    });

    companies.sort((a, b) => {
      return b.fluctuationRate - a.fluctuationRate;
    });
    return companies;
  };

  // 특정 회사의 이름을 조회합니다.
  getName = async (companyId) => {
    let getCompaniesName = await this.CompanyRepository.getCompanyName(companyId);
    if (getCompaniesName.length === 0) {
      return { message: '존재하지 않는 회사 입니다' };
    }
    return getCompaniesName;
  };
}
