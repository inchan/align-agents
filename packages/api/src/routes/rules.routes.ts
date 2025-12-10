import { Router } from 'express';
import { RulesController } from '../controllers/RulesController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    CreateRuleBodySchema,
    UpdateRuleBodySchema,
    RuleIdParamsSchema,
    SyncRulesBodySchema,
} from '../schemas/api.schemas.js';

const router = Router();
const controller = new RulesController();

// Master rules routes removed



// Sync
router.post('/sync',
    validateRequest(SyncRulesBodySchema),
    controller.sync.bind(controller)
);

// Multi-rules management
router.get('/', controller.getRulesList.bind(controller));
router.post('/',
    validateRequest(CreateRuleBodySchema),
    controller.createRule.bind(controller)
);
router.put('/:id',
    validateRequest(RuleIdParamsSchema, 'params'),
    validateRequest(UpdateRuleBodySchema),
    controller.updateRule.bind(controller)
);
router.delete('/:id',
    validateRequest(RuleIdParamsSchema, 'params'),
    controller.deleteRule.bind(controller)
);
router.put('/:id/activate',
    validateRequest(RuleIdParamsSchema, 'params'),
    controller.setActiveRule.bind(controller)
);

export default router;
