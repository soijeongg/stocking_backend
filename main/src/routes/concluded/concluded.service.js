export class ConcludedService {
  constructor(concludedrepository) {
    this.concludedrepository = concludedrepository;
  }

  getConcluded = async (userId, name, type, order) => {
    const filterData = await this.concludedrepository.filterData(userId, name, type, order);
    return filterData;
  };
}
