import { jest } from '@jest/globals';
import { OrderRepository } from '../../src/routes/order/order.repository.js';
jest.mock('../../src/utils/redisClient/index.js', () => ({
  redisClient: {
    connect: jest.fn(),
    get: jest.fn().mockResolvedValue('some value'),
    set: jest.fn().mockResolvedValue(true),
  },
}));
describe('OrderRepository', () => {
  let mockPrisma;
  let orderRepository;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findMany: jest.fn(),
      },
    };
    orderRepository = new OrderRepository(mockPrisma);
  });

  describe('filterData', () => {
    test('should filter order data correctly for ascending order', async () => {
      const userId = 'testUserId';
      const name = 'testCompany';
      const type = 'buy';
      const order = '오름차순';
      const isSold = true;
      const expectedData = [
        { id: 1, type: 'buy', Company: { name: 'testCompany' } },
        { id: 2, type: 'buy', Company: { name: 'testCompany' } },
      ];
      mockPrisma.order.findMany.mockResolvedValue(expectedData);

      const result = await orderRepository.filterData(userId, name, type, order, isSold);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          include: { Company: true },
          orderBy: { updatedAt: 'asc' },
        })
      );
      expect(result).toEqual(expectedData.filter((item) => item.Company.name === name && item.type === type));
    });

    test('should filter order data correctly for descending order', async () => {
      const userId = 'testUserId';
      const name = 'testCompany';
      const type = 'sell';
      const order = '내림차순';
      const isSold = false;
      const expectedData = [
        { id: 3, type: 'sell', Company: { name: 'testCompany' } },
        { id: 4, type: 'sell', Company: { name: 'testCompany' } },
      ];
      mockPrisma.order.findMany.mockResolvedValue(expectedData);

      const result = await orderRepository.filterData(userId, name, type, order, isSold);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          include: { Company: true },
          orderBy: { updatedAt: 'desc' },
        })
      );
      expect(result).toEqual(expectedData.filter((item) => item.Company.name === name && item.type === type));
    });

    test('should filter order data correctly without order', async () => {
      const userId = 'testUserId';
      const name = 'testCompany';
      const type = 'buy';
      const order = '';
      const isSold = true;
      const expectedData = [
        { id: 1, type: 'buy', Company: { name: 'testCompany' } },
        { id: 2, type: 'buy', Company: { name: 'testCompany' } },
        { id: 3, type: 'buy', Company: { name: 'otherCompany' } },
      ];
      mockPrisma.order.findMany.mockResolvedValue(expectedData);

      const result = await orderRepository.filterData(userId, name, type, order, isSold);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          include: { Company: true },
        })
      );
      expect(result).toEqual(expectedData.filter((item) => item.Company.name === name && item.type === type));
    });

    test('should handle errors thrown by Prisma', async () => {
      const userId = 'testUserId';
      const name = 'testCompany';
      const type = 'buy';
      const order = 'asc';
      const isSold = true;
      const errorMessage = 'Error fetching order data';
      const error = new Error(errorMessage);
      mockPrisma.order.findMany.mockRejectedValue(error);

      await expect(orderRepository.filterData(userId, name, type, order, isSold)).rejects.toThrow(error);
    });

    test('should handle incorrect order parameter', async () => {
      const userId = 'testUserId';
      const name = 'testCompany';
      const type = 'buy';
      const order = 'invalid';
      const isSold = true;
      const expectedData = [
        { id: 1, type: 'buy', Company: { name: 'testCompany' } },
        { id: 2, type: 'buy', Company: { name: 'testCompany' } },
      ];
      mockPrisma.order.findMany.mockResolvedValue(expectedData);

      const result = await orderRepository.filterData(userId, name, type, order, isSold);

      expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          include: { Company: true },
        })
      );
      expect(result).toEqual(expectedData.filter((item) => item.Company.name === name && item.type === type));
    });
  });
});
