export class RankService {
    constructor(rankrepository){
        this.rankrepository = rankrepository;
    }

    /**
   * 모든 사용자의 랭킹을 가져오는 메소드
   * @returns {Promise<object[]>} 모든 사용자의 랭킹을 반환하는 프로미스
   */
    allUsers = async() => {
        const ranking = await this.rankrepository.userRanking()
        return ranking;
    }
}