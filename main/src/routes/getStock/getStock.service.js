export class GetStockService {
  constructor(getStockrepository) {
    this.getStockrepository = getStockrepository;
  }
  
  getStock = async (name, type, order, isSold) => {
      const filterData = await this.getStockrepository.filterData(name, type, order, isSold);
      return filterData;
    };
}
    