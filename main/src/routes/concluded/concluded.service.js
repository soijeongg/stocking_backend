export class ConcludedService {
  constructor(concludedRepository) {
    this.concludedRepository = concludedRepository;
  }

  /**
   * 지정된 사용자의 특정 기준에 따라 Concluded 데이터를 검색합니다.
   * @param {string} userId - 사용자의 고유 식별자.
   * @param {string} name - 검색할 이름 또는 관련 필터.
   * @param {string} type - 데이터의 타입을 구분하는 문자열.
   * @param {string} order - 결과의 정렬 순서 지정.
   * @returns {Promise<Object[]>} - 검색 결과로 얻어진 데이터의 배열.
   */
  getConcluded = async (userId, name, type, order) => {
    // Concluded repository를 사용하여 데이터를 필터링합니다.
    const filterData = await this.concludedRepository.filterData(userId, name, type, order);
    // 필터링된 데이터를 반환합니다.
    return filterData;
  };
}
