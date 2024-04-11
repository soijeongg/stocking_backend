import { cur } from '../../utils/companyInfo/index.js';

export class CompanyService {
  constructor(CompanyRepository) {
    this.CompanyRepository = CompanyRepository;
  }
  getCompanies = async (userId, type) => {
    let companies = await this.CompanyRepository.getCompanies();
    if (companies.length === 0) {
      return companies;
    }
    companies.forEach((company) => {
      company.fluctuationRate = parseFloat(((100 * (company.currentPrice - company.initialPrice)) / company.initialPrice).toFixed(2));
    });

    //회사 정보를 정렬
    //정렬 기준 1. 팔로우 여부(팔로우가 된게 먼저 뜨도록) 2. 등락률 (내림차순)
    companies.sort((a, b) => {
      return b.fluctuationRate - a.fluctuationRate;
    });
    return companies;
  };

  getName = async (companyId) => {
    let getCompaniesName = await this.CompanyRepository.getCompanyName(companyId);
    if (!getCompaniesName) {
      return resizeBy.status(404).json({ message: '존재하지 않는 회사 입니다' });
    }
    return getCompaniesName;
  };
}
