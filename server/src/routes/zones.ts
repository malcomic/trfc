import { Router, Request, Response } from 'express'
import { getActiveZones } from '../utils/zones.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await getActiveZones())
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch zones' })
  }
})

export default router
