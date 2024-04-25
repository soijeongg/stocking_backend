//Repository Layer는 데이터베이스 이외의 다른 하위 계층은 존재하지 않음
//실제 데이터가 아닌 가짜 객체를 만들어 구현
import { expect, jest } from '@jest/globals';
import { userRepository } from '../../src/routes/user/user.repository';

let mockPrisma = {
  User: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  Company: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  Stock: {
    findMany: jest.fn(),
  },
};
let userRepositoryInstance = new userRepository(mockPrisma);

describe('User Repository Unit Test', () => {
  // 각 test가 실행되기 전에 실행됩니다.
  beforeEach(() => {
    jest.resetAllMocks(); // 모든 Mock을 초기화합니다.
  });
  //find First 함수를 테스트
  test('findFirstEmail MEthod', async () => {
    //User.findFirst의 리턴값을  설정한다
    const mockEmail = 'test@example.com';
    const userId = 1;
    const token = '12234556aaa';
    const companyId = 1;
    const mockReturn = {
      userId: 1,
      email: mockEmail,
    };
    mockPrisma.User.findFirst.mockResolvedValue(mockReturn);
    mockPrisma.Company.findFirst.mockResolvedValue(mockReturn);
    //userRepositoryInstance 의 checkemail 호출한다
    const checkEmail = await userRepositoryInstance.checkemail(mockEmail);
    const getUserInfos = await userRepositoryInstance.getUserInfo(userId);
    const getToken = await userRepositoryInstance.findToken(token);
    const getCompanyId = await userRepositoryInstance.getCompany(companyId);
    //checkemail의 값이 User.findFirst와 같다면 위의 mockReturn이 나오기 때문에 둘이 같은지 확인한다
    expect(checkEmail).toEqual(mockReturn);
    expect(getUserInfos).toEqual(mockReturn);
    expect(getToken).toEqual(mockReturn);
    expect(getCompanyId).toEqual(mockReturn);
    //User.FindFist가 정확히 한번 호출됐는지 확인한다
    expect(mockPrisma.User.findFirst).toHaveBeenCalledTimes(3);
    expect(mockPrisma.Company.findFirst).toHaveBeenCalledTimes(1);
    //userRepositorInstance의 User.find특정인자로 호출되었는지 확인한다
    expect(mockPrisma.User.findFirst).toHaveBeenCalledWith({
      where: { email: mockEmail },
    });
    expect(mockPrisma.User.findFirst).toHaveBeenCalledWith({
      where: { userId: userId },
    });
    expect(mockPrisma.User.findFirst).toHaveBeenCalledWith({
      where: { token: token },
    });
    expect(mockPrisma.Company.findFirst).toHaveBeenCalledWith({
      where: { companyId: +companyId },
      select: {
        currentPrice: true,
      },
    });
  });
  //createUser의 함수를 테스트 한다
  test('create user Method', async () => {
    const mockupReturn = 'create user String';
    mockPrisma.User.create.mockResolvedValue(mockupReturn);
    //createuser를 하기 위한 params 설정
    const createParams = {
      email: 'test@example.com',
      password: '12345aaa',
      nickname: 'test',
      token: '122334aaaa',
    };
    const createUserData = await userRepositoryInstance.createUser(createParams.email, createParams.password, createParams.nickname, createParams.token);
    expect(createUserData).toEqual(mockupReturn);
    expect(mockPrisma.User.create).toHaveBeenCalledTimes(1);
  });
  //findMany의 테스트를 진행한다
  //userinfo, userStocks
  test('find many Method', async () => {
    const mockReturn = 'find many String';
    let userId = 1;
    mockPrisma.User.findMany.mockResolvedValue(mockReturn);
    mockPrisma.Stock.findMany.mockResolvedValue(mockReturn);
    const userInfo = await userRepositoryInstance.userinfo(userId);
    const userStock = await userRepositoryInstance.userStocks(userId);
    expect(userInfo).toEqual(mockReturn);
    expect(userStock).toEqual(mockReturn);
    expect(mockPrisma.User.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.Stock.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.User.findMany).toBeCalledWith({
      where: { userId: +userId },
    });
    expect(mockPrisma.User.findMany).toBeCalledWith({
      where: { userId: +userId },
    });
  });
  test('find update Method', async () => {
    const nickname = 'test';
    const userId = 1;
    const password = 'aaaaa123';
    const totalAsset = 1;
    const mockReturn = 'updateUser string';
    mockPrisma.User.update.mockResolvedValue(mockReturn);
    const updateNicknameData = await userRepositoryInstance.updateNickname(nickname, userId);
    const updatePassworData = await userRepositoryInstance.updatePassword(password, userId);
    const updateBothData = await userRepositoryInstance.updateBoth(nickname, password, userId);
    expect(updateNicknameData).toEqual(mockReturn);
    expect(updatePassworData).toEqual(mockReturn);
    expect(updateBothData).toEqual(mockReturn);
    expect(mockPrisma.User.update).toHaveBeenCalledTimes(3);
  });

  test('find delete Method', async () => {
    let userId = 1;
    const mockReturn = 'delete User string';
    mockPrisma.User.delete.mockResolvedValue(mockReturn);
    const deleteUserData = await userRepositoryInstance.deleteUser(userId);
    expect(deleteUserData).toEqual(mockReturn);
  });
});
