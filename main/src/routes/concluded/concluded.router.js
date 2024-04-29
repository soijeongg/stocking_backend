import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import { prismaReplica } from '../../utils/prisma/index.js';
import { ConcludedController } from './concluded.controller.js';
import { ConcludedService } from './concluded.service.js';
import { ConcludedRepository } from './concluded.repository.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 레포지토리, 서비스, 컨트롤러 초기화
const concludedRepository = new ConcludedRepository(prisma, prismaReplica);
const concludedService = new ConcludedService(concludedRepository);
const concludedController = new ConcludedController(concludedService);

// GET 요청에 대한 라우팅 설정: 인증 미들웨어를 사용하여 접근 권한 관리
router.get('/', authMiddleware, concludedController.getConcluded);

export default router;
