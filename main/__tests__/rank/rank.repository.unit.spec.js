// import { jest } from '@jest/globals';
// import { userRepository } from '../../../src/routes/user/user.repository.js';

// let mockPrisma = {
//   User: {
//     findFirst: jest.fn(),
//     findUnique: jest.fn(),
//     create: jest.fn(),
//     update: jest.fn(),
//     delete: jest.fn(),
//   },
// };

// // 'userRepository'를 'userRepositoryInstance'로 변경했습니다.
// let userRepositoryInstance = new userRepository(mockPrisma);

// describe('User Repository Unit Test', () => {
//   // 각 test가 실행되기 전에 실행됩니다.
//   beforeEach(() => {
//     jest.resetAllMocks();
//   });

//   test('checkEmail Method', async () => {
//     const mockEmail = 'test@example.com';
//     const mockReturn = { email: mockEmail }; // 예상 반환값
//     mockPrisma.User.findFirst.mockReturnValue(Promise.resolve(mockReturn));

//     const result = await userRepositoryInstance.checkEmail(mockEmail);

//     expect(mockPrisma.User.findFirst).toHaveBeenCalledTimes(1);
//     expect(mockPrisma.User.findFirst).toHaveBeenCalledWith({
//       where: { email: mockEmail },
//     });
//     expect(result).toEqual(mockReturn);
//   });

//   test('createUser Method', async () => {
//     const mockUser = {
//       email: 'new@example.com',
//       password: 'password123',
//       nickname: 'newUser',
//     };
//     const mockReturn = { id: 1, ...mockUser };
//     mockPrisma.User.create.mockReturnValue(Promise.resolve(mockReturn));

//     const result = await userRepositoryInstance.createUser(mockUser.email, mockUser.password, mockUser.nickname);

//     expect(mockPrisma.User.create).toHaveBeenCalledTimes(1);
//     expect(mockPrisma.User.create).toHaveBeenCalledWith({
//       data: {
//         email: mockUser.email,
//         nickname: mockUser.nickname,
//         password: expect.any(String), // 비밀번호는 해시되므로, any(String)을 사용합니다.
//       },
//     });
//     expect(result).toEqual(mockReturn);
//   });
//   test('updateNickname Method', async () => {
//     const userId = 1;
//     const newNickname = 'updatedNickname';
//     const mockReturn = { userId, nickname: newNickname };
//     mockPrisma.User.update.mockReturnValue(Promise.resolve(mockReturn));

//     const result = await userRepositoryInstance.updateNickname(newNickname, userId);

//     expect(mockPrisma.User.update).toHaveBeenCalledTimes(1);
//     expect(mockPrisma.User.update).toHaveBeenCalledWith({
//       where: { userId: +userId },
//       data: { nickname: newNickname },
//     });
//     expect(result).toEqual(mockReturn);
//   });
// });
