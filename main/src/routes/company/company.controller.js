export class CompanyController {
  constructor(CompanyService) {
    this.CompanyService = CompanyService;
  }

  getCompanies = async (req, res, next) => {
    try {
      const companies = await this.CompanyService.getCompanies();
      res.status(200).json(companies);
    } catch (err) {
      next(err);
    }
  };
  getCompanyNameController = async (req, res, next) => {
    try {
      let { companyId } = req.body;
      let companyName = await this.CompanyService.getName(companyId);
      return res.status(200).json(companyName);
    } catch (err) {
      next(err);
    }
  };
}
