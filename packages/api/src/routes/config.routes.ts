import { Router } from 'express';
import { ConfigController } from '../controllers/ConfigController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    GetConfigQuerySchema,
    SaveConfigBodySchema,
} from '../schemas/api.schemas.js';

const router = Router();
const controller = new ConfigController();

router.get('/',
    validateRequest(GetConfigQuerySchema, 'query'),
    controller.getConfig.bind(controller)
);
router.post('/',
    validateRequest(SaveConfigBodySchema),
    controller.saveConfig.bind(controller)
);

export default router;
