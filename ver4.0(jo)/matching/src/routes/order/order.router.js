import express from 'express';
import { prisma } from '../../utils/prisma/index.js';
import authMiddleware from '../../middlewares/authMiddleware.js';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { OrderRepository } from './order.repository.js';

const orderRepository = new OrderRepository(prisma);
const orderService = new OrderService(orderRepository, prisma);
const orderController = new OrderController(orderService);

const router = express.Router();

//주문 조회 요청(쿼리로 주문번호를 받음)
router.get('/', authMiddleware, orderController.getOrder);
//주문 생성 요청
router.post('/', authMiddleware, orderController.postOrder);
//주문 정정 요청(쿼리로 주문번호를 받음)
router.put('/', authMiddleware, orderController.updateOrder);
//주문 삭제 요청(쿼리로 주문번호를 받음)
router.delete('/', authMiddleware, orderController.deleteOrder);

export default router;
