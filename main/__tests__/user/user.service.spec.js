import { describe, expect, jest } from '@jest/globals';
import { userService } from '../../src/routes/user/user.service.js';

let mockRepository = {
  checkemail: jest.fn(),
  createUser: jest.fn(),
  updateNickname: jest.fn(),
  updatePassword: jest.fn(),
  updateBoth: jest.fn(),
  deleteUser: jest.fn(),
  findToken: jest.fn(),
  updateStatus: jest.fn(),
  userinfo: jest.fn(),
  userStocks: jest.fn(),
  getCompany: jest.fn(),
};
let UserService = new userService(mockRepository);
describe('user Service Unit Test', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  test('checkmeail Method', async () => {
    const sampleEmail = 'test@test.com';
    mockRepository.checkemail.mockResolvedValue(false);
    await expect(UserService.checkEmailService(sampleEmail)).resolves.toBeUndefined();
    expect(mockRepository.checkemail).toHaveBeenCalledTimes(1);
  });
  test('createUserService- 회원가입 중복 존재 ', async () => {
    const sampleUser = {
      userId: 1,
      email: 'test@test.com',
      password: 'testtest',
      provider: null,
      token: '1234sssssss',
      nickname: 'test',
      currentMony: 10000,
      totalAsset: 100000,
      initialSeed: 100000,
      mmr: 0,
      tier: 'bronze',
      dummy: false,
      tradableMoney: 100000,
    };
    mockRepository.checkemail.mockResolvedValue(true);
    //mockRepository.createUser.mockResolvedValue(null);
    await expect(UserService.createUserService(sampleUser.email, sampleUser.password, sampleUser.nickname, sampleUser.token)).rejects.toThrow('이미 등록된 이메일입니다');
    expect(mockRepository.createUser).not.toHaveBeenCalled();
  });

  test('createUserService- 회원가입 성공적 ', async () => {
    const sampleUser = {
      email: 'test@test.com',
      password: 'password123',
      nickname: 'nickname',
      token: '71c10ee4127d68db0e092dc808a9009d7e1dec4f',
    };
    mockRepository.checkemail.mockResolvedValue(false);
    mockRepository.createUser.mockResolvedValue({
      userId: 1,
      email: sampleUser.email,
      token: sampleUser.token,
      nickname: sampleUser.nickname,
      currentMoney: 10000,
      totalAsset: 100000,
      initialSeed: 100000,
      mmr: 0,
      tier: 'bronze',
      dummy: false,
      tradableMoney: 100000,
    });
    const createUserResult = await UserService.createUserService(sampleUser.email, sampleUser.password, sampleUser.nickname, sampleUser.token);
    expect(createUserResult).toEqual(
      expect.objectContaining({
        userId: 1,
        email: sampleUser.email,
        nickname: sampleUser.nickname,
      })
    );
    expect(mockRepository.createUser).toHaveBeenCalledWith(sampleUser.email, sampleUser.password, sampleUser.nickname, expect.any(String));
  });

  test('updateName Method', async () => {
    const sampleUser = {
      userId: 1,
      email: 'test@test.com',
      password: 'testtest',
      provider: null,
      token: '1234sssssss',
      nickname: 'test',
      currentMony: 10000,
      totalAsset: 100000,
      initialSeed: 100000,
      mmr: 0,
      tier: 'bronze',
      dummy: false,
      tradableMoney: 100000,
    };
    const updateResult = {
      ...sampleUser,
      nickname: 'new_nickname', // Assuming the nickname is changed
    };
    mockRepository.updateNickname.mockResolvedValue(updateResult);
    // Call the method under test
    const result = await UserService.changeUserNickname(updateResult.nickname, sampleUser.userId);

    // Check the results
    expect(result).toEqual(updateResult);
    expect(mockRepository.updateNickname).toHaveBeenCalledWith(updateResult.nickname, sampleUser.userId);
    expect(mockRepository.updateNickname).toHaveBeenCalledTimes(1);
  });
  test('changeUserPassword Method', async () => {
    const sampleUser = {
      userId: 1,
      email: 'test@test.com',
      password: 'testtest',
      provider: null,
      token: '1234sssssss',
      nickname: 'test',
      currentMony: 10000,
      totalAsset: 100000,
      initialSeed: 100000,
      mmr: 0,
      tier: 'btonze',
      dummy: false,
      tradableMoney: 100000,
    };
    const updateResult = 'new1234ssss';
    mockRepository.updatePassword.mockResolvedValue(updateResult, sampleUser.userId);
    const result = await UserService.changeUserPassword(updateResult, sampleUser.userId);
    expect(result).toEqual(updateResult);
  });
  //회원삭제 메서드를 검사한다
  test('deleteUserService Method', async () => {
    const sampleUser = {
      userId: 1,
      email: 'test@test.com',
      password: 'testtest',
      provider: null,
      token: '1234sssssss',
      nickname: 'test',
      currentMony: 10000,
      totalAsset: 100000,
      initialSeed: 100000,
      mmr: 0,
      tier: 'bronze',
      dummy: false,
      tradableMoney: 100000,
    };
    //먼저 유저 아이디로 회원정보를 찾고  유저아이디를 사용해 유저를 삭제한다
    mockRepository.deleteUser.mockResolvedValue(sampleUser);
    const result = await UserService.deleteUserService(sampleUser.userId);
    expect(result).toEqual(sampleUser);
    expect(mockRepository.deleteUser).toHaveBeenCalledWith(sampleUser.userId);
  });

  //회원삭제 메서드 실패
  test('deleteUserService Method fail', async () => {
    let noUserId = 2;
    mockRepository.deleteUser.mockResolvedValue(null);
    await expect(UserService.deleteUserService(noUserId)).rejects.toThrow('삭제에 실패했거나 존재하지 않는 유저입니다');
    expect(mockRepository.deleteUser).toHaveBeenCalledWith(noUserId);
  });
});
