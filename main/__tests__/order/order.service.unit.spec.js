import { jest } from '@jest/globals';
import { OrderService } from '../../src/routes/order/order.service.js';

describe('OrderService', () => {
  let mockOrderRepository;
  let orderService;

  beforeEach(() => {
    mockOrderRepository = {
      filterData: jest.fn(),
    };
    orderService = new OrderService(mockOrderRepository);
  });

  describe('getOrder', () => {
    test('should return filtered order data', async () => {
      const userId = 'testUserId';
      const name = 'testName';
      const type = 'testType';
      const order = 'testOrder';
      const isSold = true;
      const expectedData = [
        { id: 1, name: 'Order1', type: 'buy' },
        { id: 2, name: 'Order2', type: 'sell' },
      ];

      mockOrderRepository.filterData.mockResolvedValue(expectedData);

      const result = await orderService.getOrder(userId, name, type, order, isSold);

      expect(mockOrderRepository.filterData).toHaveBeenCalledWith(userId, name, type, order, isSold);
      expect(result).toEqual(expectedData);
    });

    test('should handle errors thrown by the repository', async () => {
      const userId = 'testUserId';
      const name = 'testName';
      const type = 'testType';
      const order = 'testOrder';
      const isSold = true;
      const errorMessage = 'Error fetching order data';
      const error = new Error(errorMessage);

      mockOrderRepository.filterData.mockRejectedValue(error);

      const result = await orderService.getOrder(userId, name, type, order, isSold);

      expect(mockOrderRepository.filterData).toHaveBeenCalledWith(userId, name, type, order, isSold);
      expect(result).toEqual({ message: '주문 조회 과정에서 에러가 발생했습니다.' });
    });
  });
});
