import { Router } from 'express';
import { McpController } from '../controllers/McpController.js';

const router = Router();
const controller = new McpController();

// MCP Sets routes
router.get('/', controller.getSets.bind(controller));
router.post('/', controller.createSet.bind(controller));
router.put('/:id', controller.updateSet.bind(controller));
router.delete('/:id', controller.deleteSet.bind(controller));
router.put('/:id/activate', controller.setActiveSet.bind(controller));

export default router;
