import express from 'express';

import stock from './stock/stock.router.js';
import rank from './rank/rank.router.js';
import userRouter from './user/user.router.js';
import order from './order/order.router.js';
import company from './company/company.router.js';
import concluded from './concluded/concluded.router.js';

const router = express.Router();
router.use('/', [stock, rank, company]);
router.use('/', userRouter);
router.use('/order', order);
router.use('/concluded', concluded);

export default router;
