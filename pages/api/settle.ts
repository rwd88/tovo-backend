import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method is allowed' });
  }

  const { marketId } = req.body;

  if (!marketId) {
    return res.status(400).json({ error: 'Missing marketId' });
  }

  try {
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market || !market.outcome) {
      return res.status(400).json({ error: 'Market not found or not resolved' });
    }

    const winningTrades = await prisma.trade.findMany({
      where: {
        marketId,
        type: market.outcome,
      },
    });

    const losingTrades = await prisma.trade.findMany({
      where: {
        marketId,
        NOT: { type: market.outcome },
      },
    });

    let houseEarnings = 0;
    const updatedTrades = [];

    for (const trade of winningTrades) {
      const payout = trade.amount + trade.fee;
      houseEarnings += 0; // No fee from winners beyond original trade fee
      updatedTrades.push(
        prisma.trade.update({
          where: { id: trade.id },
          data: { payout },
        })
      );
    }

    for (const trade of losingTrades) {
      const lossAmount = trade.amount;
      const lossCut = lossAmount * 0.1; // 10% from losing side to house
      houseEarnings += lossCut;
      const payout = 0; // losers get nothing
      updatedTrades.push(
        prisma.trade.update({
          where: { id: trade.id },
          data: { payout },
        })
      );
    }

    await prisma.$transaction(updatedTrades);

    res.status(200).json({
      success: true,
      message: `Settled market ${marketId}`,
      houseEarnings,
      totalWinners: winningTrades.length,
      totalLosers: losingTrades.length,
    });
  } catch (error) {
    console.error('Settle error:', error);
    res.status(500).json({ error: 'Server error during settlement' });
  }
}
 
