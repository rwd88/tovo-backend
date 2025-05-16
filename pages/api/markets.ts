// pages/api/markets.ts

import { PrismaClient } from '@prisma/client'
import type { NextApiRequest, NextApiResponse } from 'next'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res
      .status(405)
      .json({ error: 'Only GET method is allowed on this endpoint.' })
  }

  try {
    // Fetch all markets, newest first
    const markets = await prisma.market.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return res.status(200).json(markets)
  } catch (err) {
    console.error('Error fetching markets:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
