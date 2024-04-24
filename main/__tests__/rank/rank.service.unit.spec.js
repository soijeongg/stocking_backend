// import { jest } from '@jest/globals';
// import { userService } from '../../../src/routes/user/user.service.js';
// import argon2 from 'argon2';

// // userRepository의 메소드를 mock 함수로 생성합니다.
// const mockUserRepository = {
//   checkEmail: jest.fn(),
//   checkNickname: jest.fn(),
//   createUser: jest.fn(),
//   findNickname: jest.fn(),
//   updateEmail: jest.fn(),
//   updateNickname: jest.fn(),
//   updatePassword: jest.fn(),
//   updateEmailNickname: jest.fn(),
//   updateEmailPassword: jest.fn(),
//   updatePasswordNickname: jest.fn(),
//   updateEmailNicknamePassword: jest.fn(),
//   deleteUser: jest.fn(),
// };

// // userService 인스턴스를 생성합니다.
// const userServiceInstance = new userService(mockUserRepository);

// // 각 테스트 전에 mock 함수들의 상태를 초기화합니다.
// beforeEach(() => {
//   jest.resetAllMocks();
// });

// describe('createEmailService', () => {
//   const email = 'test@example.com';
//   const password = 'securePassword';
//   const nickname = 'testNickname';

//   test('should throw error if email already exists', async () => {
//     mockUserRepository.checkEmail.mockResolvedValue(true);

//     await expect(userServiceInstance.createEmailService(email, password, nickname)).rejects.toThrow('이미 등록된 이메일 입니다');

//     expect(mockUserRepository.checkEmail).toHaveBeenCalledWith(email);
//   });

//   test('should throw error if nickname already exists', async () => {
//     mockUserRepository.checkEmail.mockResolvedValue(false);
//     mockUserRepository.checkNickname.mockResolvedValue(true);

//     await expect(userServiceInstance.createEmailService(email, password, nickname)).rejects.toThrow('이미 등록된 닉네임 입니다');

//     expect(mockUserRepository.checkNickname).toHaveBeenCalledWith(nickname);
//   });

//   test('should create user if email and nickname are unique', async () => {
//     mockUserRepository.checkEmail.mockResolvedValue(false);
//     mockUserRepository.checkNickname.mockResolvedValue(false);
//     mockUserRepository.createUser.mockResolvedValue({ email, password, nickname });

//     const result = await userServiceInstance.createEmailService(email, password, nickname);

//     expect(result).toEqual({ email, password, nickname });
//     expect(mockUserRepository.createUser).toHaveBeenCalledWith(email, password, nickname);
//   });
// });