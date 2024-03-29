import { cur } from '../../utils/companyInfo/index.js';

export class CompanyService {
  constructor(CompanyRepository) {
    this.CompanyRepository = CompanyRepository;
  }
  getCompanies = async (userId, type) => {
    await this.CompanyRepository.updateFluctuationRate();
    let followList = await this.CompanyRepository.getFollowCompanies(userId);
    let followcomapnies = {};
    followList.forEach((company) => {
      followcomapnies[company.name] = true;
    });
    let companies;
    if (type === 'all') {
      companies = await this.CompanyRepository.getCompanies();
    }
    if (type === 'follow') {
      companies = await this.CompanyRepository.getFollowCompanies(userId);
    }
    companies.forEach((company) => {
      company.isFollow = followcomapnies[company.name] ? true : false;
    });
    //회사 정보를 정렬
    //정렬 기준 1. 팔로우 여부(팔로우가 된게 먼저 뜨도록) 2. 등락률 (내림차순)
    companies.sort((a, b) => {
      if (a.isFollow && !b.isFollow) {
        return -1;
      } else if (!a.isFollow && b.isFollow) {
        return 1;
      } else {
        return b.fluctuationRate - a.fluctuationRate;
      }
    });
    //추가적으로 cur을 이용해서
    // comapanies에 현재가를 추가한다.
    for (let company of companies) {
      company.cur = cur[company.name];
    }
    return companies;
  };
}
