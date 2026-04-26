import { Router, Request, Response } from 'express';
import { collaborativeFilteringService } from '../services/collaborative-filtering.service';
import { contentBasedService } from '../services/content-based.service';
import { abTestingService } from '../services/ab-testing.service';
import { logger } from '../utils/logger';

const router = Router();

// Collaborative Filtering Routes
router.post('/recommendations/collab/train', async (req: Request, res: Response) => {
  try {
    const result = await collaborativeFilteringService.train();
    res.json({ success: true, job: result });
  } catch (error) {
    logger.error('Training failed:', error);
    res.status(500).json({ error: 'Training failed' });
  }
});

router.get('/recommendations/collab/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const exclude = req.query.exclude as string[] || [];

    const recommendations = await collaborativeFilteringService.getRecommendations(userId, limit, exclude);
    res.json({ success: true, recommendations });
  } catch (error) {
    logger.error('Get recommendations failed:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.get('/recommendations/collab/status', async (req: Request, res: Response) => {
  const status = collaborativeFilteringService.getTrainingStatus();
  const stats = collaborativeFilteringService.getModelStats();
  res.json({ status, stats });
});

// Content-Based Routes
router.post('/embeddings/products', async (req: Request, res: Response) => {
  try {
    const { products } = req.body;
    await contentBasedService.batchUpdateEmbeddings(products);
    res.json({ success: true, count: products.length });
  } catch (error) {
    logger.error('Batch update failed:', error);
    res.status(500).json({ error: 'Batch update failed' });
  }
});

router.get('/similar/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const similar = await contentBasedService.getSimilarProducts(productId, limit);
    res.json({ success: true, products: similar });
  } catch (error) {
    logger.error('Get similar products failed:', error);
    res.status(500).json({ error: 'Failed to get similar products' });
  }
});

// A/B Testing Routes
router.post('/experiments', async (req: Request, res: Response) => {
  try {
    const test = await abTestingService.createTest(req.body);
    res.json({ success: true, test });
  } catch (error) {
    logger.error('Create experiment failed:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

router.post('/experiments/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await abTestingService.startExperiment({ id, name: '', description: '', status: 'running', variants: [], targetAudience: { percentage: 100 }, startDate: new Date(), metrics: [] });
    res.json({ success: true });
  } catch (error) {
    logger.error('Start experiment failed:', error);
    res.status(500).json({ error: 'Failed to start experiment' });
  }
});

router.post('/experiments/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await abTestingService.stopExperiment(id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Stop experiment failed:', error);
    res.status(500).json({ error: 'Failed to stop experiment' });
  }
});

router.get('/experiments', async (req: Request, res: Response) => {
  const status = req.query.status as 'draft' | 'running' | 'completed' | 'paused';
  const tests = abTestingService.listTests(status);
  res.json({ success: true, tests });
});

router.get('/experiments/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const results = await abTestingService.getTestResults(id);
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Get results failed:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

export default router;