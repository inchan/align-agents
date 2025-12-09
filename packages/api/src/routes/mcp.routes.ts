import { Router } from 'express';
import { McpController } from '../controllers/McpController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    SaveMasterMcpBodySchema,
    SyncMcpBodySchema,
    CreateMcpDefinitionBodySchema,
    UpdateMcpDefinitionBodySchema,
    McpIdParamsSchema,
    CreateMcpSetBodySchema,
    UpdateMcpSetBodySchema,
    McpSetIdParamsSchema,
} from '../schemas/api.schemas.js';

const router = Router();
const controller = new McpController();

// Master MCP
router.get('/master', controller.getMasterMcp.bind(controller));
router.post('/master',
    validateRequest(SaveMasterMcpBodySchema),
    controller.saveMasterMcp.bind(controller)
);

// Sync
router.post('/sync',
    validateRequest(SyncMcpBodySchema),
    controller.sync.bind(controller)
);

// MCP Definitions routes
router.get('/definitions', controller.getDefinitions.bind(controller));
router.post('/definitions',
    validateRequest(CreateMcpDefinitionBodySchema),
    controller.createDefinition.bind(controller)
);
router.put('/definitions/:id',
    validateRequest(McpIdParamsSchema, 'params'),
    validateRequest(UpdateMcpDefinitionBodySchema),
    controller.updateDefinition.bind(controller)
);
router.delete('/definitions/:id',
    validateRequest(McpIdParamsSchema, 'params'),
    controller.deleteDefinition.bind(controller)
);

// MCP Sets routes
router.get('/sets', controller.getSets.bind(controller));
router.post('/sets',
    validateRequest(CreateMcpSetBodySchema),
    controller.createSet.bind(controller)
);
router.put('/sets/:id',
    validateRequest(McpSetIdParamsSchema, 'params'),
    validateRequest(UpdateMcpSetBodySchema),
    controller.updateSet.bind(controller)
);
router.delete('/sets/:id',
    validateRequest(McpSetIdParamsSchema, 'params'),
    controller.deleteSet.bind(controller)
);
router.put('/sets/:id/activate',
    validateRequest(McpSetIdParamsSchema, 'params'),
    controller.setActiveSet.bind(controller)
);

export default router;
