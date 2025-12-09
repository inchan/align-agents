import { Router } from 'express';
import { ToolsController } from '../controllers/ToolsController.js';

const router = Router();
const controller = new ToolsController();

router.get('/', controller.list.bind(controller));
router.post('/scan', controller.scan.bind(controller));
router.post('/pick-folder', controller.pickFolder.bind(controller));
router.get('/recent-projects', controller.getRecentProjects.bind(controller));

export default router;
