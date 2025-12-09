import { Router } from 'express';
import { ProjectsController } from '../controllers/ProjectsController.js';

const router = Router();
const controller = new ProjectsController();

// Get all projects
router.get('/', controller.getProjects.bind(controller));

// Create a new project
router.post('/', controller.createProject.bind(controller));

// Scan for projects
router.post('/scan', controller.scanProjects.bind(controller));

// Get project details
router.get('/:id/details', controller.getProjectDetails.bind(controller));

// Update a project
router.put('/:id', controller.updateProject.bind(controller));

// Delete a project
router.delete('/:id', controller.deleteProject.bind(controller));

export default router;
