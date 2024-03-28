/**
 * 팔로우 서비스 클래스
 */
export class FollowService {
    /**
     * @param {FollowRepository} followrepository - 팔로우 저장소 객체
     */
    constructor(followrepository){
      this.followrepository = followrepository;
    }
  
    /**
     * 사용자가 회사를 팔로우(찜)하는 메소드
     * @param {number} userId - 사용자 ID
     * @param {number} companyId - 회사 ID
     * @returns {Promise<object>} 팔로우 결과를 반환하는 프로미스
     */
    followCompany = async (userId, companyId) => {
      const followCompany = await this.followrepository.findCompanyById(companyId)
      if(!followCompany){
        const error = new Error('회사가 존재하지 않습니다.');
        error.status = 404;
        throw error;
      }
  
      const follow = await this.followrepository.userFollowCompany(userId, companyId);
      return follow;
    }
  }
  