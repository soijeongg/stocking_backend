import { jest } from '@jest/globals';
import { RankController } from '../../src/routes/rank/rank.controller.js';

describe('RankController', () => {
  let mockRankService;
  let rankController;
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    mockRankService = {
      allUsers: jest.fn(),
      allmmrUsers: jest.fn(),
    };

    rankController = new RankController(mockRankService);

    mockRequest = {}; // 필요에 따라 추가 속성을 설정할 수 있습니다.
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('getRanking Method', () => {
    test('should return user ranking data with a 200 status code', async () => {
      const userRankingData = [
        { nickname: 'User1', earningRate: 10.5, ranking: 1 },
        { nickname: 'User2', earningRate: 9.5, ranking: 2 },
      ];
      mockRankService.allUsers.mockResolvedValue(userRankingData);

      await rankController.getRanking(mockRequest, mockResponse, nextFunction);

      expect(mockRankService.allUsers).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(userRankingData);
    });

    test('should handle errors by calling next with an error', async () => {
      const errorMessage = 'Error fetching ranking data';
      const error = new Error(errorMessage);
      mockRankService.allUsers.mockRejectedValue(error);

      await rankController.getRanking(mockRequest, mockResponse, nextFunction);

      expect(mockRankService.allUsers).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe('getmmrRanking Method', () => {
    test('should return MMR ranking data with a 200 status code', async () => {
      const mmrRankingData = [
        { nickname: 'Player1', mmr: 1000, tier: 'Gold', ranking: 1 },
        { nickname: 'Player2', mmr: 950, tier: 'Silver', ranking: 2 },
      ];
      mockRankService.allmmrUsers.mockResolvedValue(mmrRankingData);

      await rankController.getmmrRanking(mockRequest, mockResponse, nextFunction);

      expect(mockRankService.allmmrUsers).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mmrRankingData);
    });

    test('should handle errors by calling next with an error', async () => {
      const errorMessage = 'Error fetching MMR ranking data';
      const error = new Error(errorMessage);
      mockRankService.allmmrUsers.mockRejectedValue(error);

      await rankController.getmmrRanking(mockRequest, mockResponse, nextFunction);

      expect(mockRankService.allmmrUsers).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });
});
