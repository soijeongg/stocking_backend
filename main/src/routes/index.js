import express from 'express';
import follow from './follow/follow.router.js'
import stock from './stock/stock.router.js'
import rank from './rank/rank.router.js'

const router = express.Router();

router.use('/',[follow, stock, rank]);

export default router;
