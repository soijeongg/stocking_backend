export class ConcludedController {
  constructor(concludedservice) {
    this.concludedservice = concludedservice;
  }

  getconcluded = async (req, res, next) => {
    const { name, type, order } = req.query;

    const { userId } = res.locals.user;
    console.log('userId: ', userId);

    const result = await this.concludedservice.getConcluded(userId, name, type, order);
    return res.status(200).json(result);
  };
}
