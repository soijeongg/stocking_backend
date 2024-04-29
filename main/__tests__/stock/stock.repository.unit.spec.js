import { jest } from '@jest/globals';
import { StockRepository } from '../../src/routes/stock/stock.repository.js';
let mockPrisma;
let mockPrismaReplica = {
  stock: {
    findMany: jest.fn(),
  },
};

let stockRepositoryInstance = new StockRepository(mockPrisma, mockPrismaReplica);

describe('Stock Repository', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('findStockByUserId Method', () => {
    const mockStocksReturn = [
      { userId: 1, stockId: 1, Company: { currentPrice: 100, initialPrice: 50 } },
      { userId: 1, stockId: 2, Company: { currentPrice: 200, initialPrice: 150 } },
    ];

    test('should successfully fetch user stocks', async () => {
      mockPrismaReplica.stock.findMany.mockResolvedValue(mockStocksReturn);

      const result = await stockRepositoryInstance.findStockByUserId(1);

      expect(mockPrismaReplica.stock.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaReplica.stock.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: { Company: true },
      });
      expect(result).toEqual(mockStocksReturn);
    });

    test('should handle errors when fetching user stocks', async () => {
      const errorMessage = 'Error fetching user stocks';
      mockPrismaReplica.stock.findMany.mockRejectedValue(new Error(errorMessage));

      await expect(stockRepositoryInstance.findStockByUserId(1)).rejects.toThrow(errorMessage);

      expect(mockPrismaReplica.stock.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrismaReplica.stock.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: { Company: true },
      });
    });

    test('should return a message if no stocks found', async () => {
      mockPrismaReplica.stock.findMany.mockResolvedValue([]);

      const result = await stockRepositoryInstance.findStockByUserId(999);

      expect(result).toEqual({ message: '보유하신 주식이 없습니다' });
    });
  });
});
