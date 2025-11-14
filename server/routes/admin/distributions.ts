import { Router } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import {
  createDistributionEvent,
  calculateAllocations,
  getDistributionEvent,
  getProjectDistributions,
  getDistributionAllocations,
  getLPAllocations,
  cancelDistributionEvent,
  getDistributionStats,
} from '../../lib/distributions';
import {
  getDistributionEventActivity,
  getProjectDistributionActivity,
  getRecentDistributionActivity,
} from '../../lib/distributionAuditLib';
import { z } from 'zod';

const router = Router();

const createDistributionEventSchema = z.object({
  projectId: z.string().uuid(),
  eventType: z.enum(['revenue', 'exit', 'dividend', 'other']),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  distributionDate: z.string().datetime(),
});

const calculateAllocationsSchema = z.object({
  distributionEventId: z.string().uuid(),
});

const cancelDistributionEventSchema = z.object({
  cancellationReason: z.string().min(1),
});

/**
 * POST /api/admin/distributions
 * Create a new distribution event
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const validatedData = createDistributionEventSchema.parse(req.body);
    const adminId = req.userId!;

    const result = await createDistributionEvent(
      validatedData.projectId,
      validatedData.eventType,
      validatedData.title,
      validatedData.totalAmount,
      new Date(validatedData.distributionDate),
      adminId,
      validatedData.description,
      req
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json(result.event);
  } catch (error: any) {
    console.error('Error creating distribution event:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to create distribution event' });
  }
});

/**
 * POST /api/admin/distributions/:id/calculate
 * Calculate allocations for a distribution event
 */
router.post('/:id/calculate', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId!;

    const result = await calculateAllocations(id, adminId, req);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({
      allocations: result.allocations,
      totalAllocated: result.totalAllocated,
    });
  } catch (error: any) {
    console.error('Error calculating allocations:', error);
    res.status(500).json({ error: 'Failed to calculate allocations' });
  }
});

/**
 * POST /api/admin/distributions/:id/cancel
 * Cancel a distribution event
 */
router.post('/:id/cancel', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = cancelDistributionEventSchema.parse(req.body);
    const adminId = req.userId!;

    const result = await cancelDistributionEvent(
      id,
      adminId,
      validatedData.cancellationReason,
      req
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json(result.event);
  } catch (error: any) {
    console.error('Error cancelling distribution event:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    res.status(500).json({ error: 'Failed to cancel distribution event' });
  }
});

/**
 * GET /api/admin/distributions/stats
 * Get distribution statistics
 */
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const { projectId } = req.query;

    const result = await getDistributionStats(projectId as string | undefined);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json(result.stats);
  } catch (error: any) {
    console.error('Error fetching distribution stats:', error);
    res.status(500).json({ error: 'Failed to fetch distribution stats' });
  }
});

/**
 * GET /api/admin/distributions/activity/recent
 * Get recent distribution activity across all projects
 */
router.get('/activity/recent', authenticate, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await getRecentDistributionActivity(limit);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json(result.activities);
  } catch (error: any) {
    console.error('Error fetching recent distribution activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent distribution activity' });
  }
});

/**
 * GET /api/admin/distributions/:id
 * Get a distribution event by ID
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getDistributionEvent(id);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.status(200).json(result.event);
  } catch (error: any) {
    console.error('Error fetching distribution event:', error);
    res.status(500).json({ error: 'Failed to fetch distribution event' });
  }
});

/**
 * GET /api/admin/distributions/:id/allocations
 * Get allocations for a distribution event
 */
router.get('/:id/allocations', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getDistributionAllocations(id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json(result.allocations);
  } catch (error: any) {
    console.error('Error fetching distribution allocations:', error);
    res.status(500).json({ error: 'Failed to fetch distribution allocations' });
  }
});

/**
 * GET /api/admin/distributions/:id/activity
 * Get activity log for a distribution event
 */
router.get('/:id/activity', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await getDistributionEventActivity(id, limit);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json(result.activities);
  } catch (error: any) {
    console.error('Error fetching distribution event activity:', error);
    res.status(500).json({ error: 'Failed to fetch distribution event activity' });
  }
});

/**
 * GET /api/admin/distributions
 * Get all distribution events (with optional project filter)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { projectId } = req.query;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const result = await getProjectDistributions(projectId as string);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json(result.distributions);
  } catch (error: any) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({ error: 'Failed to fetch distributions' });
  }
});

export default router;
