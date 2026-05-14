import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Partnerships endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
