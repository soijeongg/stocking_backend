import { describe, jest } from '@jest/globals';
import { userController } from '../../src/routes/user/user.controller.js';

const mockService = {
  createUserService: jest.fn(),
  checkEmailService: jest.fn(),
  changeUserNicknamePassword: jest.fn(),
  changeUserPassword: jest.fn(),
  deleteUserService: jest.fn(),
  selectUserInfo: jest.fn(),
  selectUserSimpleInfo: jest.fn(),
  verifyUserEmail: jest.fn(),
};

const mockRequest = {
  body: {},
};

const mockResponse = {
  locals: {},
  status: jest.fn(),
  json: jest.fn(),
};

const mockNext = jest.fn();

const UserController = new userController(mockService);

describe('user controller unit test', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockResponse.status.mockReturnValue(mockResponse);
    mockRequest.params = {};
    mockResponse.locals = {};
  });

  test('signupController success', async () => {
    const sampleUser = {
      email: 'test@test.com',
      password: 'testtest',
      nickname: 'test',
    };
    mockRequest.body = sampleUser;
    const returnUser = {
      userId: 1,
      email: sampleUser.email,
      password: sampleUser.password,
      provider: null,
      token: '1234sssssss',
      nickname: sampleUser.nickname,
      currentMoney: 10000,
      totalAsset: 100000,
      initialSeed: 100000,
      mmr: 0,
      tier: 'bronze',
      dummy: false,
      tradableMoney: 100000,
    };
    mockService.createUserService.mockResolvedValue(returnUser);

    await UserController.signupController(mockRequest, mockResponse, mockNext);

    // Check if the service was called with the right arguments
    expect(mockService.createUserService).toHaveBeenCalledWith(sampleUser.email, sampleUser.password, sampleUser.nickname);
    // Check if the response was properly sent
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'test님 환영합니다' });
  });
  test('signup fail not email', async () => {
    mockRequest.body = {
      email: 'notEmail', // Deliberately invalid
      password: 'validPassword123',
      nickname: 'validNickname',
    };
    await UserController.signupController(mockRequest, mockResponse, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
  test('signup fail not right password ', async () => {
    mockRequest.body = {
      email: 'test@test.com', // Deliberately invalid
      password: 'n',
      nickname: 'validNickname',
    };
    await UserController.signupController(mockRequest, mockResponse, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
  test('signup fail not right nickname ', async () => {
    mockRequest.body = {
      email: 'test@test.com', // Deliberately invalid
      password: 'validPassword123',
      nickname: '12',
    };
    await UserController.signupController(mockRequest, mockResponse, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
  test('deleteUseController Method', async () => {
    const userId = 1;
    mockRequest.params.userId = userId;
    mockResponse.locals.user = { userId };
    mockService.deleteUserService.mockResolvedValue({ message: '성공적으로 삭제 되었습니다' });
    await UserController.deleteUserController(mockRequest, mockResponse, mockNext);
    expect(mockService.deleteUserService).toHaveBeenCalledWith(userId);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: '성공적으로 삭제 되었습니다' });
  });
  test('deleteUserController fail', async () => {
    const userId = 1;
    mockRequest.params.userId = userId;
    mockResponse.locals.user = { userId };
    const error = new Error('delete error');
    mockService.deleteUserService.mockRejectedValue(error);
    await UserController.deleteUserController(mockRequest, mockResponse, mockNext);
    expect(mockService.deleteUserService).toHaveBeenCalledWith(userId);
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
