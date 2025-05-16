// pages/api/cron/import-markets.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import cheerio from 'cheerio'

const prisma = new PrismaClient()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only GET allowed (for Cron)
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Only GET allowed' })
  }

  try {
    // 1) Wipe yesterday’s markets
    await prisma.market.deleteMany({})

    // 2) Fetch today’s calendar
    const { data: html } = await axios.get(
      'https://www.forexfactory.com/calendar.php?day=today'
    )
    const $ = cheerio.load(html)

    // 3) Grab every TD with the red high-impact icon, then its parent TR
    const rows = $('td.calendar__cell--impact--3')
      .closest('tr.calendar__row')
      .toArray()

    let added = 0

    // 4) Up to 20 high-impact events
    for (const el of rows.slice(0, 20)) {
      const timeText     = $(el).find('td.calendar__cell--time').text().trim()
      const eventText    = $(el).find('td.calendar__cell--event').text().trim()
      const forecastText = $(el).find('td.calendar__cell--forecast').text().trim()
      const forecast     = parseFloat(forecastText) || 0

      // Build a JS Date for today at that time
      const [hour, minute] = timeText.split(':').map(n => parseInt(n, 10))
      const now = new Date()
      const eventTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute
      )

      const question = `${eventText} at ${timeText}`

      await prisma.market.create({
        data: {
          question,
          status:    'open',
          eventTime,
          forecast,
          outcome:   null,
          poolYes:   0,
          poolNo:    0,
        },
      })
      added++
    }

    return res.status(200).json({
      success: true,
      deleted: rows.length, // number of old markets wiped
      added,
    })
  } catch (err) {
    console.error('Import-markets cron error:', err)
    return res.status(500).json({ error: 'Import failed' })
  } finally {
    await prisma.$disconnect()
  }
}
