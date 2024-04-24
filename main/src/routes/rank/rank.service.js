export class RankService {
  constructor(rankrepository) {
    this.rankrepository = rankrepository;
  }

  /**
   * @description 데이터베이스에서 수익률 상위 5%인 사용자 정보를 조회하여 가공된 형태로 반환합니다.
   * 각 사용자의 닉네임, 수익률, 그리고 랭킹 정보가 포함된 객체를 배열로 구성하여 반환합니다.
   * @returns {Promise<Object[]>} 사용자 랭킹 정보를 담은 객체 배열을 비동기적으로 반환합니다.
   * 각 객체는 {nickname: string, earningRate: number, ranking: number} 형태를 가집니다.
   */
  allUsers = async () => {
    const userlist = await this.rankrepository.userRanking();
    const ranking = userlist.map((user, index) => {
      return {
        nickname: user.nickname,
        earningRate: user.earningRate,
        ranking: user.ranking,
      };
    });
    return ranking;
  };
  /**
   * @description 데이터베이스에서 MMR 상위 5등인 사용자 정보를 조회하여 가공된 형태로 반환합니다.
   * 반환되는 배열은 각 사용자에 대한 닉네임, MMR 값, 티어, 그리고 계산된 랭킹을 포함합니다.
   * @returns {Promise<Object[]>} 각 사용자의 MMR 정보를 담은 객체 배열을 비동기적으로 반환합니다.
   * 각 객체는 {nickname: string, mmr: number, tier: string, ranking: number} 형태를 가집니다.
   */
  allmmrUsers = async () => {
    const userlist = await this.rankrepository.usermmrRanking();
    const ranking = userlist.map((user, index) => {
      return {
        nickname: user.nickname,
        mmr: user.mmr,
        tier: user.tier,
        ranking: index + 1,
      };
    });
    return ranking;
  };
}
