export class RankRepository {
  constructor(prisma, prismaReplica) {
    this.prisma = prisma;
    this.prismaReplica = prismaReplica;
  }
  /**
   * @description 랭크 테이블에서 rank를 기준으로 오름차순으로 정렬하여 상위 5명의 사용자 정보를 조회합니다.
   * @returns {Promise<Object[]>} 사용자 랭킹 정보를 담은 객체 배열을 비동기적으로 반환합니다.
   */
  userRanking = async () => {
    const ranking = await this.prismaReplica.rank.findMany({
      orderBy: {
        ranking: 'asc',
      },
    });
    return ranking;
  };
  /**
   * @description 유저 테이블에서 사용자의 MMR을 기준으로 내림차순 정렬하여 상위 5명의 사용자 정보를 조회합니다.
   * @returns {Promise<Object[]>} 상위 5명의 사용자 정보를 담은 객체 배열을 비동기적으로 반환합니다.
   */
  usermmrRanking = async () => {
    const usermmrRanking = await this.prismaReplica.user.findMany({
      orderBy: {
        mmr: 'desc',
      },
      take: 5,
    });
    return usermmrRanking;
  };
}
