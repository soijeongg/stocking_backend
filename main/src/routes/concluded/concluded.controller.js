export class ConcludedController {
  constructor(concludedservice) {
    this.concludedservice = concludedservice;
  }

  getconcluded = async (req, res, next) => {
    const { name, type, order } = req.query;

    let { userId } = res.locals.user;

    const result = await this.concludedservice.getConcluded(userId, name, type, order);
    return res.status(200).json(result);
  };
}
