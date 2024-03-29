export class GetStockController {
  constructor(getStockservice) {
    this.getStockservice = getStockservice;
  }

  stockInquery = async (req, res, next) => {
    const { name, type, order, isSold } = req.query;

    const result = await this.getStockservice.getStock(name, type, order, isSold);
    return res.status(200).json(result);
  };
}
