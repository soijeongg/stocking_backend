import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import { cur, rate, gap } from '../../utils/companyInfo/index.js';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { OrderRepository } from './order.repository.js';

const orderRepository = new OrderRepository(prisma);
const orderService = new OrderService(orderRepository, cur, rate, gap);
const orderController = new OrderController(orderService);

const router = express.Router();

//주문 조회 요청
router.get('/', orderController.getOrder);
//주문 생성 요청
router.post('/', orderController.postOrder);
//주문 정정 요청
router.put('/', orderController.updateOrder);
//주문 삭제 요청
router.delete('/', orderController.deleteOrder);

export default router;
