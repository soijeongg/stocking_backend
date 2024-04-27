import { jest } from '@jest/globals';
import { RankService } from '../../src/routes/rank/rank.service.js';

// RankRepository의 메소드를 mock 함수로 생성합니다.
const mockRankRepository = {
  userRanking: jest.fn(),
  usermmrRanking: jest.fn(),
};

// RankService 인스턴스를 생성합니다.
const rankServiceInstance = new RankService(mockRankRepository);

describe('RankService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('userRanking Method', () => {
    const mockUserList = [
      { nickname: 'User1', earningRate: 10.5, ranking: 1 },
      { nickname: 'User2', earningRate: 9.5, ranking: 2 },
      { nickname: 'User3', earningRate: 8.5, ranking: 3 },
    ];

    test('should fetch user rankings and return formatted data (Success Case)', async () => {
      mockRankRepository.userRanking.mockResolvedValue(mockUserList);

      const result = await rankServiceInstance.allUsers();

      expect(mockRankRepository.userRanking).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        mockUserList.map((user) => ({
          nickname: user.nickname,
          earningRate: user.earningRate,
          ranking: user.ranking,
        }))
      );
    });

    test('should handle errors during the user ranking fetch (Failure Case)', async () => {
      const errorMessage = 'Failed to fetch user rankings';
      mockRankRepository.userRanking.mockRejectedValue(new Error(errorMessage));

      await expect(rankServiceInstance.allUsers()).rejects.toThrow(errorMessage);

      expect(mockRankRepository.userRanking).toHaveBeenCalledTimes(1);
    });
  });

  describe('usermmrRanking Method', () => {
    const mockMmrUserList = [
      { nickname: 'Player1', mmr: 1000, tier: 'Gold', ranking: 1 },
      { nickname: 'Player2', mmr: 950, tier: 'Silver', ranking: 2 },
      { nickname: 'Player3', mmr: 900, tier: 'Bronze', ranking: 3 },
    ];

    test('should fetch mmr rankings and return formatted data (Success Case)', async () => {
      mockRankRepository.usermmrRanking.mockResolvedValue(mockMmrUserList);

      const result = await rankServiceInstance.allmmrUsers();

      expect(mockRankRepository.usermmrRanking).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        mockMmrUserList.map((user, index) => ({
          nickname: user.nickname,
          mmr: user.mmr,
          tier: user.tier,
          ranking: index + 1,
        }))
      );
    });

    test('should handle errors during the mmr ranking fetch (Failure Case)', async () => {
      const errorMessage = 'Failed to fetch mmr rankings';
      mockRankRepository.usermmrRanking.mockRejectedValue(new Error(errorMessage));

      await expect(rankServiceInstance.allmmrUsers()).rejects.toThrow(errorMessage);

      expect(mockRankRepository.usermmrRanking).toHaveBeenCalledTimes(1);
    });
  });
});
