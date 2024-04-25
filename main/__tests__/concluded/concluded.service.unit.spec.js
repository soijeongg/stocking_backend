import { jest } from '@jest/globals';
import {ConcludedService} from '../../src/routes/concluded/concluded.service.js';

describe('ConcludedService', () => {
  let mockConcludedRepository;
  let concludedService;

  beforeEach(() => {
    mockConcludedRepository = {
      filterData: jest.fn(),
    };
    concludedService = new ConcludedService(mockConcludedRepository);
  });

  describe('getConcluded', () => {
    test('should return filtered concluded data', async () => {
      const userId = 'testUserId';
      const name = 'testName';
      const type = 'testType';
      const order = 'testOrder';
      const expectedData = [
        { name: 'Concluded1', type: 'type1' },
        { name: 'Concluded2', type: 'type2' },
      ];

      mockConcludedRepository.filterData.mockResolvedValue(expectedData);

      const result = await concludedService.getConcluded(userId, name, type, order);

      expect(mockConcludedRepository.filterData).toHaveBeenCalledWith(userId, name, type, order);
      expect(result).toEqual(expectedData);
    });

    test('should handle errors thrown by the repository', async () => {
      const userId = 'testUserId';
      const name = 'testName';
      const type = 'testType';
      const order = 'testOrder';
      const errorMessage = 'Error filtering concluded data';
      const error = new Error(errorMessage);

      mockConcludedRepository.filterData.mockRejectedValue(error);

      await expect(concludedService.getConcluded(userId, name, type, order)).rejects.toThrow(error);
    });
  });
});
