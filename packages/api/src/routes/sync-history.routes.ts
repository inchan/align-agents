import { Router } from 'express';
import { SyncHistoryController } from '../controllers/SyncHistoryController.js';
import { getDatabase } from '@align-agents/cli/src/infrastructure/database.js';
import { SyncHistoryRepository } from '@align-agents/cli/src/infrastructure/repositories/SyncHistoryRepository.js';

const router = Router();

// Initialize repository and controller
const db = getDatabase() as any; // Type assertion for compatibility
const syncHistoryRepo = new SyncHistoryRepository(db);
const syncHistoryController = new SyncHistoryController(syncHistoryRepo);

// Routes
router.get('/stats', (req, res) => syncHistoryController.getStats(req, res));
router.get('/recent', (req, res) => syncHistoryController.getRecent(req, res));
router.get('/:id', (req, res) => syncHistoryController.getById(req, res));
router.get('/', (req, res) => syncHistoryController.getAll(req, res));
router.post('/:id/retry', (req, res) => syncHistoryController.retry(req, res));
router.delete('/cleanup', (req, res) => syncHistoryController.cleanup(req, res));

export default router;
