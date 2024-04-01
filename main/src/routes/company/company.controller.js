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
}
