/**
 * 팔로우 저장소 클래스
 */
export class FollowRepository {
  /**
   * @param {PrismaClient} prisma - Prisma 클라이언트 객체
   */
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * 사용자가 회사를 팔로우(찜)하는 메소드
   * @param {number} userId - 사용자 ID
   * @param {number} companyId - 회사 ID
   * @returns {Promise<object>} 팔로우 결과를 반환하는 프로미스
   */
  userFollowCompany = async (userId, companyId) => {
    const followExists = await this.prisma.follow.findFirst({
      where: {
        userId: +userId,
        companyId: +companyId,
      },
    });
    if(followExists){
      await this.prisma.follow.deleteMany({
        where: {
          userId: +userId,
          companyId: +companyId,
        }
      })
      return { message: '팔로잉을 취소했습니다' };
    }else{
      const newFollow = await this.prisma.follow.create({
        data:{
          userId: +userId,
          companyId: +companyId,
        }
      })
      return { message: '팔로잉을 완료했습니다' };
    }  
  };

  /**
   * 회사를 ID로 검색하는 메소드
   * @param {number} companyId - 회사 ID
   * @returns {Promise<object>} 회사 정보를 반환하는 프로미스
   */
  findCompanyById = async(companyId) => {
    const company = await this.prisma.company.findFirst({
      where: {
        companyId: +companyId,
      }
    })
    return company;
  }
}
