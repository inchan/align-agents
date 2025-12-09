import { Router } from 'express';
import { McpController } from '../controllers/McpController.js';

const router = Router();
const controller = new McpController();

// MCP Definitions Pool routes
router.get('/', controller.getDefinitions.bind(controller));
router.post('/', controller.createDefinition.bind(controller));
router.put('/:id', controller.updateDefinition.bind(controller));
router.delete('/:id', controller.deleteDefinition.bind(controller));

export default router;
