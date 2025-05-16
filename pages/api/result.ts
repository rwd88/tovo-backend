import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { marketId, outcome } = req.body;

  if (!marketId || !['yes', 'no'].includes(outcome)) {
    return res.status(400).json({ error: 'Invalid marketId or outcome' });
  }

  try {
    // Update market outcome
    const updatedMarket = await prisma.market.update({
      where: { id: marketId },
      data: { outcome },
    });

    res.status(200).json({ success: true, market: updatedMarket });
  } catch (error) {
    console.error('Error resolving market:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
 
