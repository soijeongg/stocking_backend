export class RankRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * 모든 사용자의 랭킹을 가져오는 메소드
   * @returns {Promise<object[]>} 모든 사용자의 랭킹을 반환하는 프로미스
   */
  userRanking = async () => {
    const ranking = await this.prisma.rank.findMany({
      orderBy: {
        ranking: 'asc',
      },
    });
    return ranking;
  };
  usermmrRanking = async () => {
    const usermmrRanking = await this.prisma.user.findMany({
      orderBy: {
        mmr: 'desc',
      },
      take: 5,
    });
    return usermmrRanking;
  };
}
