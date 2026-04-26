import { Router, Request, Response } from 'express';
import { fraudDetectionService } from '../services/fraud-detection.service';
import { logger } from '../utils/logger';

const router = Router();

router.post('/check', async (req: Request, res: Response) => {
  try {
    const { transaction } = req.body;
    const result = await fraudDetectionService.checkTransaction(transaction);
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Fraud check failed:', error);
    res.status(500).json({ error: 'Fraud check failed' });
  }
});

router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = await fraudDetectionService.getUserProfile(userId);
    res.json({ success: true, profile });
  } catch (error) {
    logger.error('Get profile failed:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;