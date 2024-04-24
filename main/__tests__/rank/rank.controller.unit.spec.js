// import { userController } from '../../../src/routes/user/user.controller.js';
// import { jest } from '@jest/globals';

// describe('userController', () => {
//   let mockUserService;
//   let usercontroller;
//   let mockRequest;
//   let mockResponse;
//   let nextFunction;

//   beforeEach(() => {
//     mockUserService = {
//       createEmailService: jest.fn(),
//       checkEnailed: jest.fn(),
//       logined: jest.fn(),
//       getNickname: jest.fn(),
//       updateUserServiceEmail: jest.fn(),
//       updateUserServicePassword: jest.fn(),
//       updateUserServiceNickname: jest.fn(),
//       updateUserEmailPassword: jest.fn(),
//       updateUserPasswordNickname: jest.fn(),
//       updateUserEmailNickname: jest.fn(),
//       updateUserPassportsNicknameEmail: jest.fn(),
//       deleteUserService: jest.fn(),
//     };

//     usercontroller = new userController(mockUserService);

//     mockRequest = { body: {}, params: {}, session: {}, res: { locals: {} } };
//     mockResponse = {
//       status: jest.fn(() => mockResponse),
//       json: jest.fn(),
//       locals: jest.fn(),
//     };
//     nextFunction = jest.fn();
//   });

//   // 회원가입 테스트
//   describe('postSignUpcontroller', () => {
//     test('should validate user input and create a new user', async () => {
//       const reqBody = {
//         email: 'test@example.com',
//         password: 'securePassword',
//         nickname: 'testUser',
//       };
//       mockRequest.body = reqBody;
//       mockUserService.createEmailService.mockResolvedValue(true);

//       await usercontroller.postSignUpcontroller(mockRequest, mockResponse, nextFunction);

//       expect(mockUserService.createEmailService).toHaveBeenCalledWith(reqBody.email, reqBody.password, reqBody.nickname);
//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({ message: `${reqBody.nickname}님 환영합니다` });
//     });
//   });

//   // 로그인 테스트
//   describe('loginController', () => {
//     test('should validate login input and initiate session for user', async () => {
//       const reqBody = {
//         email: 'test@example.com',
//         password: 'securePassword',
//       };
//       const nickname = 'testUser';
//       const userId = 'userId123';
//       mockRequest.body = reqBody;
//       mockUserService.logined.mockResolvedValue(`${nickname},${userId}`);

//       await usercontroller.loginController(mockRequest, mockResponse, nextFunction);

//       expect(mockUserService.logined).toHaveBeenCalledWith(reqBody.email, reqBody.password);
//       expect(mockResponse.status).toHaveBeenCalledWith(200);
//       expect(mockResponse.json).toHaveBeenCalledWith({ messages: `${nickname}님 안녕하세요` });
//     });
//   });
// });