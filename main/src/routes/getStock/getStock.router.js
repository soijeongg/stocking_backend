import express from 'express';
import { prisma } from '../../utils/prisma/index.js'
import {GetStockController} from './getStock.controller.js'
import {GetStockService} from './getStock.service.js'
import {GetStockRepository} from './getStock.repository.js'


const router = express.Router()
const getStockRepository = new GetStockRepository(prisma)
const getStockService = new GetStockService(getStockRepository)
const getStockController = new GetStockController(getStockService)

router.get('/getStock', getStockController.stockInquery)

export default router