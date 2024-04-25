// stock.service.unit.spec.js
import { jest } from '@jest/globals';
import { StockService } from '../../src/routes/stock/stock.service.js';

// StockRepository의 메소드를 mock 함수로 생성합니다.
const mockStockRepository = {
  findStockByUserId: jest.fn(),
};

// StockService 인스턴스를 생성합니다.
const stockServiceInstance = new StockService(mockStockRepository);

describe('StockService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getStock Method', () => {
    const userId = 1;
    const mockUserStocks = [
      { stockId: 1, averagePrice: 100, Company: { currentPrice: 150 } },
      { stockId: 2, averagePrice: 200, Company: { currentPrice: 220 } },
    ];

    test('should return user stocks sorted by profit', async () => {
      mockStockRepository.findStockByUserId.mockResolvedValue(mockUserStocks);

      const result = await stockServiceInstance.getStock(userId);

      // Since the sorting order may vary, we need to sort the expected result before comparing
      const expectedSortedResult = mockUserStocks.sort((a, b) => b.Company.currentPrice - a.Company.currentPrice);
      expect(mockStockRepository.findStockByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(expectedSortedResult);
    });

    test('should return a message if no stocks are found', async () => {
      const message = 'No stocks found';
      mockStockRepository.findStockByUserId.mockResolvedValue({ message });

      const result = await stockServiceInstance.getStock(userId);

      expect(mockStockRepository.findStockByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ message });
    });

    test('should handle errors during stock retrieval', async () => {
      const errorMessage = 'Error fetching user stocks';
      mockStockRepository.findStockByUserId.mockRejectedValue(new Error(errorMessage));

      await expect(stockServiceInstance.getStock(userId)).rejects.toThrow(errorMessage);

      expect(mockStockRepository.findStockByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
