import { jest } from '@jest/globals';
import { ConcludedRepository } from '../../src/routes/concluded/concluded.repository.js';

describe('ConcludedRepository', () => {
  let mockPrisma;
  let concludedRepository;

  beforeEach(() => {
    mockPrisma = {
      concluded: {
        findMany: jest.fn(),
      },
    };
    concludedRepository = new ConcludedRepository(mockPrisma);
  });

  describe('filterData', () => {
    test('should filter concluded data correctly', async () => {
      const userId = '1';
      const name = 'testCompany';
      const type = 'testType';
      const order = '오름차순';
      const expectedData = [
        { id: 1, name: 'Concluded1', type: 'testType', Company: { name: 'testCompany' } },
        { id: 2, name: 'Concluded2', type: 'testType', Company: { name: 'testCompany' } },
      ];

      mockPrisma.concluded.findMany.mockResolvedValue(expectedData);

      const result = await concludedRepository.filterData(userId, name, type, order);

      expect(mockPrisma.concluded.findMany).toHaveBeenCalledWith({
        include: { Company: true },
        where: { userId: +userId },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(expectedData);
    });

    test('should handle order correctly', async () => {
      const userId = '1';
      const name = '';
      const type = '';
      const order = '내림차순';
      const expectedData = [
        { id: 1, name: 'Concluded1', type: 'type1', Company: { name: 'Company1' } },
        { id: 2, name: 'Concluded2', type: 'type2', Company: { name: 'Company2' } },
      ];

      mockPrisma.concluded.findMany.mockResolvedValue(expectedData);

      const result = await concludedRepository.filterData(userId, name, type, order);

      expect(mockPrisma.concluded.findMany).toHaveBeenCalledWith({
        include: { Company: true },
        where: { userId: +userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(expectedData);
    });

    test('should handle errors thrown by Prisma', async () => {
      const userId = '1';
      const name = 'testCompany';
      const type = 'testType';
      const order = '오름차순';
      const errorMessage = 'Error fetching concluded data';
      const error = new Error(errorMessage);

      mockPrisma.concluded.findMany.mockRejectedValue(error);

      await expect(concludedRepository.filterData(userId, name, type, order)).rejects.toThrow(error);
    });
  });
});
