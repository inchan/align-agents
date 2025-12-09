import express from 'express';
import { StatsController } from '../controllers/StatsController.js';

const router = express.Router();
const controller = new StatsController();

router.get('/summary', controller.getSummary.bind(controller));
router.get('/activity', controller.getActivity.bind(controller));

export default router;
