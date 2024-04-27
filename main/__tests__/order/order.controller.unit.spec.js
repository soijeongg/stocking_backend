import { jest } from '@jest/globals';
import { OrderController } from '../../src/routes/order/order.controller.js';
jest.mock('../../src/utils/sendToMatchingServer/index.js', () => ({
  sendToMatchingServer: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/utils/redisClient/index.js', () => ({
  redisClient: {
    connect: jest.fn(),
    get: jest.fn().mockResolvedValue('some value'),
    set: jest.fn().mockResolvedValue(true),
  },
}));
describe('OrderController', () => {
  let mockOrderService;
  let orderController;
  let mockRequest;
  let mockResponse;

  beforeEach(() => {
    mockOrderService = {
      getOrder: jest.fn(),
    };
    orderController = new OrderController(mockOrderService);
    mockRequest = {
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        user: {
          userId: 'testUserId',
        },
      },
    };
  });

  describe('getOrder', () => {
    test('should return order data with a 200 status code', async () => {
      const userId = 'testUserId';
      const name = 'testName';
      const type = 'testType';
      const order = 'testOrder';
      const isSold = true;
      const expectedData = [
        { id: 1, name: 'Order1', type: 'buy' },
        { id: 2, name: 'Order2', type: 'sell' },
      ];

      mockRequest.query = { name, type, order, isSold };
      mockOrderService.getOrder.mockResolvedValue(expectedData);

      await orderController.getOrder(mockRequest, mockResponse);

      expect(mockOrderService.getOrder).toHaveBeenCalledWith(userId, name, type, order, isSold);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedData);
    });

    test('should handle errors and return a 400 status code', async () => {
      const errorMessage = 'Error fetching order data';
      const error = new Error(errorMessage);

      mockOrderService.getOrder.mockRejectedValue(error);

      await orderController.getOrder(mockRequest, mockResponse);

      expect(mockOrderService.getOrder).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: '주문 조회 도중 문제가 발생했습니다.' });
    });
  });
});
