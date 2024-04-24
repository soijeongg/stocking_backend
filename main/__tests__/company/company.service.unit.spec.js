import { jest } from '@jest/globals';
import { CompanyService } from '../../src/routes/company/company.service';

describe('CompanyService', () => {
  let mockCompanyRepository;
  let companyService;

  beforeEach(() => {
    mockCompanyRepository = {
      getCompanies: jest.fn(),
      getCompanyName: jest.fn(),
    };

    companyService = new CompanyService(mockCompanyRepository);
  });

  describe('getCompanies', () => {
    test('should return a list of companies with fluctuation rates', async () => {
      const companies = [
        { id: 1, currentPrice: 120, initialPrice: 100 },
        { id: 2, currentPrice: 200, initialPrice: 100 },
      ];
      mockCompanyRepository.getCompanies.mockResolvedValue(companies);
      const expectedCompanies = [
        { id: 2, currentPrice: 200, initialPrice: 100, fluctuationRate: 100.0 },
        { id: 1, currentPrice: 120, initialPrice: 100, fluctuationRate: 20.0 },
      ];

      const result = await companyService.getCompanies();

      expect(mockCompanyRepository.getCompanies).toHaveBeenCalled();
      expect(result).toEqual(expectedCompanies);
    });

    test('should return an empty array if no companies are found', async () => {
      mockCompanyRepository.getCompanies.mockResolvedValue([]);
      const result = await companyService.getCompanies();

      expect(result).toEqual([]);
    });
  });

  describe('getName', () => {
    test('should return a company name if found', async () => {
      const companyId = 1;
      const companyName = { name: 'Company1' };
      mockCompanyRepository.getCompanyName.mockResolvedValue(companyName);

      const result = await companyService.getName(companyId);

      expect(mockCompanyRepository.getCompanyName).toHaveBeenCalled();
      expect(result).toEqual(companyName);
    });

    test('should return an error message if company not found', async () => {
      const companyId = 999;
      const errorMessage = { message: '존재하지 않는 회사 입니다' };
      mockCompanyRepository.getCompanyName.mockResolvedValue([]);
      const result = await companyService.getName(companyId);

      expect(result).toEqual(errorMessage);
    });
  });
});
