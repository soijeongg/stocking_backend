import express from 'express';
import { prisma } from '../../utils/prisma/index.js'
import {FollowController} from './follow.controller.js'
import {FollowService} from './follow.service.js'
import {FollowRepository} from './follow.repository.js'
import iimsi from '../../middlewares/iimsi.js';


const router = express.Router()
const followRepository = new FollowRepository(prisma)
const followService = new FollowService(followRepository)
const followController = new FollowController(followService)

router.post('/follow/:companyId', iimsi,followController.followCompany)

export default router