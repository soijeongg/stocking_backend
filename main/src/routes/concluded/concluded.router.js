import express from 'express';
import { prisma } from '../../utils/prisma/index.js'
import {ConcludedController} from './concluded.controller.js'
import {ConcludedService} from './concluded.service.js'
import {ConcludedRepository} from './concluded.repository.js'

const router = express.Router()
const concludedRepository = new ConcludedRepository(prisma)
const concludedService = new ConcludedService(concludedRepository)
const concludedController = new ConcludedController(concludedService)

router.get('/', concludedController.getconcluded)

export default router