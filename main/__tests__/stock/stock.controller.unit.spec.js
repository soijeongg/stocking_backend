// stock.controller.unit.spec.js
import { jest } from '@jest/globals';
import { StockController } from '../../src/routes/stock/stock.controller.js';

describe('StockController', () => {
  let mockStockService;
  let stockController;
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    mockStockService = {
      getStock: jest.fn(),
    };

    stockController = new StockController(mockStockService);

    mockRequest = {}; // Add additional properties as needed
    mockResponse = {
      locals: {
        user: {
          userId: 1, // Set the user ID
        },
      },
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('getStock Method', () => {
    test('should return user stock data with a 200 status code', async () => {
      const userStockData = [
        { stockId: 1, averagePrice: 100, Company: { currentPrice: 150 } },
        { stockId: 2, averagePrice: 200, Company: { currentPrice: 220 } },
      ];

      mockStockService.getStock.mockResolvedValue(userStockData);

      await stockController.getStock(mockRequest, mockResponse, nextFunction);

      expect(mockStockService.getStock).toHaveBeenCalledWith(mockResponse.locals.user.userId);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(userStockData);
    });

    test('should handle errors by calling next with an error', async () => {
      const errorMessage = 'Error fetching user stock data';
      const error = new Error(errorMessage);

      mockStockService.getStock.mockRejectedValue(error);

      await stockController.getStock(mockRequest, mockResponse, nextFunction);

      expect(mockStockService.getStock).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });
});
