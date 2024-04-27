import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import { prismaReplica } from '../../utils/prisma/index.js';
import { CompanyRepository } from './company.repository.js';
import { CompanyService } from './company.service.js';
import { CompanyController } from './company.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router({ mergeParams: true });
const companyRepository = new CompanyRepository(prisma, prismaReplica);
const companyService = new CompanyService(companyRepository);
const companyController = new CompanyController(companyService);

router.get('/company', authMiddleware, companyController.getCompanies);
router.post('/companyName', companyController.getCompanyNameController);

export default router;
