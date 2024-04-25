import { jest } from '@jest/globals';
import {ConcludedController} from '../../src/routes/concluded/concluded.controller.js';

describe('ConcludedController', () => {
  let mockConcludedService;
  let concludedController;
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    mockConcludedService = {
      getConcluded: jest.fn(),
    };
    concludedController = new ConcludedController(mockConcludedService);
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
    nextFunction = jest.fn();
  });

  describe('getConcluded method', () => {
    test('should return concluded data with a 200 status code', async () => {
      const concludedData = [
        { name: 'Concluded1', type: 'type1' },
        { name: 'Concluded2', type: 'type2' },
      ];
      const name = 'testName';
      const type = 'testType';
      const order = 'testOrder';
      const userId = 'testUserId';

      mockRequest.query = { name, type, order };
      mockConcludedService.getConcluded.mockResolvedValue(concludedData);

      await concludedController.getConcluded(mockRequest, mockResponse, nextFunction);

      expect(mockConcludedService.getConcluded).toHaveBeenCalledWith(userId, name, type, order);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(concludedData);
    });

    test('should handle errors by calling next with an error', async () => {
      const errorMessage = 'Error fetching concluded data';
      const error = new Error(errorMessage);

      mockConcludedService.getConcluded.mockRejectedValue(error);

      await concludedController.getConcluded(mockRequest, mockResponse, nextFunction);

      expect(mockConcludedService.getConcluded).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });
});