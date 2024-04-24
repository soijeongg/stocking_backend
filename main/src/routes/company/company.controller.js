// CompanyController 클래스는 회사 관련 데이터 처리를 담당합니다.
export class CompanyController {
  constructor(CompanyService) {
    this.CompanyService = CompanyService;
  }

  // 모든 회사 정보를 조회합니다.
  getCompanies = async (req, res, next) => {
    try {
      const companies = await this.CompanyService.getCompanies();
      res.status(200).json(companies);
    } catch (err) {
      next(err);
    }
  };

  // 특정 회사의 이름을 조회합니다.
  getCompanyNameController = async (req, res, next) => {
    try {
      let { companyId } = req.body;
      let companyName = await this.CompanyService.getName(companyId);
      if (companyName.message === '존재하지 않는 회사 입니다') return res.status(404).json(companyName);
      return res.status(200).json(companyName);
    } catch (err) {
      next(err);
    }
  };
}
