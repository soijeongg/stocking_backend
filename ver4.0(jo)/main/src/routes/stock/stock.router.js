import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import { StockController } from './stock.controller.js';
import { StockService } from './stock.service.js';
import { StockRepository } from './stock.repository.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();
const stockRepository = new StockRepository(prisma);
const stockService = new StockService(stockRepository);
const stockController = new StockController(stockService);

router.get('/stock', authMiddleware, stockController.getStock);

export default router;
