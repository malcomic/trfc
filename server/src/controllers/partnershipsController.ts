import { Request, Response } from 'express'

export async function submitPartnership(req: Request, res: Response) {
  try {
    res.json({ message: 'Partnership submitted' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
