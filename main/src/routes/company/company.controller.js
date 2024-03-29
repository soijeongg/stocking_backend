export class CompanyController {
  constructor(CompanyService) {
    this.CompanyService = CompanyService;
  }

  getCompanies = async (req, res, next) => {
    try {
      const type = req.query.type;
      if (type !== 'all' && type !== 'follow') {
        const error = new Error('잘못된 요청입니다.');
        error.status = 400;
        throw error;
      }
      const userId = res.locals.user.userId;
      const companies = await this.CompanyService.getCompanies(userId, type);
      res.status(200).json(companies);
    } catch (err) {
      next(err);
    }
  };
}
