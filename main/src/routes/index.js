import express from 'express';

import follow from './follow/follow.router.js';
import stock from './stock/stock.router.js';
import rank from './rank/rank.router.js';
import userRouter from './user/user.router.js';
import order from './order/order.router.js';

const router = express.Router();
router.use('/', [follow, stock, rank]);
router.use('/', userRouter);
router.use('/order', order);

export default router;
