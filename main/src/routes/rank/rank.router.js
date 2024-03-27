import express from 'express';
import { prisma } from '../../utils/prisma/index.js'
import {RankController} from './rank.controller.js'
import {RankService} from './rank.service.js'
import {RankRepository} from './rank.repository.js'


const router = express.Router()
const rankRepository = new RankRepository(prisma)
const rankService = new RankService(rankRepository)
const rankController = new RankController(rankService)

router.get('/rank', rankController.getRanking)

export default router