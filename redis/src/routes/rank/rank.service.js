export class RankService {
  constructor(rankrepository) {
    this.rankrepository = rankrepository;
  }

  /**
   * 모든 사용자의 랭킹을 가져오는 메소드
   * @returns {Promise<object[]>} 모든 사용자의 랭킹을 반환하는 프로미스
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
