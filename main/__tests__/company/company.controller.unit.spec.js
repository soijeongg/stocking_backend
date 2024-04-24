import { jest } from '@jest/globals';
import { CompanyController } from '../../src/routes/company/company.controller';

describe('CompanyController', () => {
  let mockCompanyService;
  let companyController;
  let mockRequest;
  let mockResponse;
  let nextFunction;

  beforeEach(() => {
    mockCompanyService = {
      getCompanies: jest.fn(),
      getName: jest.fn(),
    };

    companyController = new CompanyController(mockCompanyService);

    mockRequest = {}; // 필요에 따라 추가 속성을 설정할 수 있습니다.
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('getCompanies', () => {
    test('should return company data with a 200 status code', async () => {
      const companyData = [
        { id: 1, name: 'Company1', fluctuationRate: 10.5 },
        { id: 2, name: 'Company2', fluctuationRate: 9.5 },
      ];
      mockCompanyService.getCompanies.mockResolvedValue(companyData);

      await companyController.getCompanies(mockRequest, mockResponse, nextFunction);

      expect(mockCompanyService.getCompanies).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(companyData);
    });

    test('should handle errors by calling next with an error', async () => {
      const errorMessage = 'Error fetching company data';
      const error = new Error(errorMessage);
      mockCompanyService.getCompanies.mockRejectedValue(error);

      await companyController.getCompanies(mockRequest, mockResponse, nextFunction);

      expect(mockCompanyService.getCompanies).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe('getCompanyNameController', () => {
    test('should return company name if found', async () => {
      mockRequest.body = { companyId: 1 };
      const companyNameData = { name: 'Company1' };
      mockCompanyService.getName.mockResolvedValue(companyNameData);

      await companyController.getCompanyNameController(mockRequest, mockResponse, nextFunction);

      expect(mockCompanyService.getName).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(companyNameData);
    });

    test('should return 404 if company does not exist', async () => {
      mockRequest.body = { companyId: 999 };
      const responseMessage = { message: '존재하지 않는 회사 입니다' };
      mockCompanyService.getName.mockResolvedValue(responseMessage);

      await companyController.getCompanyNameController(mockRequest, mockResponse, nextFunction);

      expect(mockCompanyService.getName).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(responseMessage);
    });

    test('should handle errors by calling next with an error', async () => {
      mockRequest.body = { companyId: 1 };
      const errorMessage = 'Error fetching company name';
      const error = new Error(errorMessage);
      mockCompanyService.getName.mockRejectedValue(error);

      await companyController.getCompanyNameController(mockRequest, mockResponse, nextFunction);

      expect(mockCompanyService.getName).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });
});
