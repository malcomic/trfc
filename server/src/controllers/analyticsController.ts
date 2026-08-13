import { Request, Response } from 'express'
import { pool } from '../server.js'
import { parseAnalyticsDateRange, dateRangeSql, AnalyticsDateRange } from '../utils/analyticsDateRange.js'

function pctChange(current: number, previous: number): { trend: 'up' | 'down' | 'neutral'; trendPercent: number } {
  if (previous === 0) {
    if (current === 0) return { trend: 'neutral', trendPercent: 0 }
    return { trend: 'up', trendPercent: 100 }
  }
  const change = ((current - previous) / previous) * 100
  return {
    trend: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'neutral',
    trendPercent: parseFloat(Math.abs(change).toFixed(1)),
  }
}

async function queryPaidSum(
  amountExpr: string,
  fromAndJoins: string,
  createdAtCol: string,
  range: AnalyticsDateRange,
  previous = false
): Promise<number> {
  const statusCol = createdAtCol.startsWith('t.')
    ? 't.payment_status'
    : createdAtCol.startsWith('p.')
      ? 'p.payment_status'
      : 'payment_status'
  const { clause, params: dateParams } = dateRangeSql(createdAtCol, range, 2, { previous })
  const result = await pool.query(
    `SELECT COALESCE(SUM(${amountExpr}), 0) as total
     FROM ${fromAndJoins}
     WHERE ${statusCol} = $1${clause}`,
    ['paid', ...dateParams]
  )
  return parseFloat(result.rows[0].total)
}

async function queryCount(
  fromAndJoins: string,
  createdAtCol: string,
  range: AnalyticsDateRange,
  paymentStatus?: string,
  previous = false
): Promise<number> {
  const params: (string | number)[] = []
  let where = 'WHERE 1=1'
  let idx = 1
  const statusCol = createdAtCol.startsWith('t.')
    ? 't.payment_status'
    : createdAtCol.startsWith('p.')
      ? 'p.payment_status'
      : 'payment_status'

  if (paymentStatus) {
    where += ` AND ${statusCol} = $${idx}`
    params.push(paymentStatus)
    idx++
  }
  const { clause, params: dateParams } = dateRangeSql(createdAtCol, range, idx, { previous })
  const result = await pool.query(
    `SELECT COUNT(*) as total FROM ${fromAndJoins} ${where}${clause}`,
    [...params, ...dateParams]
  )
  return parseInt(result.rows[0].total)
}

export const analyticsController = {
  getDashboardSummary: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)

      const [
        orderRevenue,
        ticketRevenue,
        hireRevenue,
        medalRevenue,
        prevOrderRevenue,
        prevTicketRevenue,
        prevHireRevenue,
        prevMedalRevenue,
        totalOrders,
        paidOrders,
        prevTotalOrders,
        prevPaidOrders,
        ticketCount,
        paidTickets,
        prevTicketCount,
        prevPaidTickets,
        hireCount,
        paidHires,
        prevHireCount,
        prevPaidHires,
        medalCount,
        paidMedals,
        prevMedalCount,
        prevPaidMedals,
        totalUsers,
      ] = await Promise.all([
        queryPaidSum('total_amount', 'orders', 'created_at', range),
        queryPaidSum('e.price', 'tickets t JOIN events e ON t.event_id = e.id', 't.created_at', range),
        queryPaidSum('total_cost', 'equipment_hire', 'created_at', range),
        queryPaidSum(
          'o.price',
          'medal_purchases p JOIN medal_options o ON p.medal_option_id = o.id',
          'p.created_at',
          range
        ),
        queryPaidSum('total_amount', 'orders', 'created_at', range, true),
        queryPaidSum('e.price', 'tickets t JOIN events e ON t.event_id = e.id', 't.created_at', range, true),
        queryPaidSum('total_cost', 'equipment_hire', 'created_at', range, true),
        queryPaidSum(
          'o.price',
          'medal_purchases p JOIN medal_options o ON p.medal_option_id = o.id',
          'p.created_at',
          range,
          true
        ),
        queryCount('orders', 'created_at', range),
        queryCount('orders', 'created_at', range, 'paid'),
        queryCount('orders', 'created_at', range, undefined, true),
        queryCount('orders', 'created_at', range, 'paid', true),
        queryCount('tickets t', 't.created_at', range),
        queryCount('tickets t', 't.created_at', range, 'paid'),
        queryCount('tickets t', 't.created_at', range, undefined, true),
        queryCount('tickets t', 't.created_at', range, 'paid', true),
        queryCount('equipment_hire', 'created_at', range),
        queryCount('equipment_hire', 'created_at', range, 'paid'),
        queryCount('equipment_hire', 'created_at', range, undefined, true),
        queryCount('equipment_hire', 'created_at', range, 'paid', true),
        queryCount('medal_purchases p', 'p.created_at', range),
        queryCount('medal_purchases p', 'p.created_at', range, 'paid'),
        queryCount('medal_purchases p', 'p.created_at', range, undefined, true),
        queryCount('medal_purchases p', 'p.created_at', range, 'paid', true),
        pool.query('SELECT COUNT(*) as total FROM users').then((r) => parseInt(r.rows[0].total)),
      ])

      const periodRevenue = orderRevenue + ticketRevenue + hireRevenue + medalRevenue
      const prevPeriodRevenue =
        prevOrderRevenue + prevTicketRevenue + prevHireRevenue + prevMedalRevenue

      const paymentTotal = totalOrders + ticketCount + hireCount + medalCount
      const paymentPaid = paidOrders + paidTickets + paidHires + paidMedals
      const paymentSuccessRate = paymentTotal > 0 ? (paymentPaid / paymentTotal) * 100 : 0

      const prevPaymentTotal = prevTotalOrders + prevTicketCount + prevHireCount + prevMedalCount
      const prevPaymentPaid = prevPaidOrders + prevPaidTickets + prevPaidHires + prevPaidMedals
      const prevSuccessRate = prevPaymentTotal > 0 ? (prevPaymentPaid / prevPaymentTotal) * 100 : 0

      const avgOrderValue = paidOrders > 0 ? orderRevenue / paidOrders : 0
      const prevAov = prevPaidOrders > 0 ? prevOrderRevenue / prevPaidOrders : 0

      const revenueTrend = pctChange(periodRevenue, prevPeriodRevenue)

      return res.json({
        totalRevenue: parseFloat(periodRevenue.toFixed(2)),
        periodRevenue: parseFloat(periodRevenue.toFixed(2)),
        thisMonthRevenue: parseFloat(periodRevenue.toFixed(2)),
        orderRevenue: parseFloat(orderRevenue.toFixed(2)),
        ticketRevenue: parseFloat(ticketRevenue.toFixed(2)),
        equipmentRevenue: parseFloat(hireRevenue.toFixed(2)),
        medalRevenue: parseFloat(medalRevenue.toFixed(2)),
        totalOrders,
        paidOrders,
        paymentSuccessRate: parseFloat(paymentSuccessRate.toFixed(1)),
        totalUsers,
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        trends: {
          totalRevenue: revenueTrend,
          periodRevenue: revenueTrend,
          totalOrders: pctChange(totalOrders, prevTotalOrders),
          paymentSuccessRate: pctChange(paymentSuccessRate, prevSuccessRate),
          avgOrderValue: pctChange(avgOrderValue, prevAov),
        },
      })
    } catch (error: any) {
      console.error('Error in getDashboardSummary:', error)
      return res.status(500).json({ error: 'Failed to fetch dashboard summary' })
    }
  },

  getRevenueTimeline: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)

      const [orders, tickets, hires, medals] = await Promise.all([
        (async () => {
          const d = dateRangeSql('created_at', range, 2)
          const r = await pool.query(
            `SELECT DATE_TRUNC('day', created_at) as date,
                    COALESCE(SUM(total_amount), 0) as revenue,
                    COUNT(*) as txns
             FROM orders
             WHERE payment_status = $1${d.clause}
             GROUP BY DATE_TRUNC('day', created_at)`,
            ['paid', ...d.params]
          )
          return r.rows
        })(),
        (async () => {
          const d = dateRangeSql('t.created_at', range, 2)
          const r = await pool.query(
            `SELECT DATE_TRUNC('day', t.created_at) as date,
                    COALESCE(SUM(e.price), 0) as revenue,
                    COUNT(*) as txns
             FROM tickets t
             JOIN events e ON t.event_id = e.id
             WHERE t.payment_status = $1${d.clause}
             GROUP BY DATE_TRUNC('day', t.created_at)`,
            ['paid', ...d.params]
          )
          return r.rows
        })(),
        (async () => {
          const d = dateRangeSql('created_at', range, 2)
          const r = await pool.query(
            `SELECT DATE_TRUNC('day', created_at) as date,
                    COALESCE(SUM(total_cost), 0) as revenue,
                    COUNT(*) as txns
             FROM equipment_hire
             WHERE payment_status = $1${d.clause}
             GROUP BY DATE_TRUNC('day', created_at)`,
            ['paid', ...d.params]
          )
          return r.rows
        })(),
        (async () => {
          const d = dateRangeSql('p.created_at', range, 2)
          const r = await pool.query(
            `SELECT DATE_TRUNC('day', p.created_at) as date,
                    COALESCE(SUM(o.price), 0) as revenue,
                    COUNT(*) as txns
             FROM medal_purchases p
             JOIN medal_options o ON p.medal_option_id = o.id
             WHERE p.payment_status = $1${d.clause}
             GROUP BY DATE_TRUNC('day', p.created_at)`,
            ['paid', ...d.params]
          )
          return r.rows
        })(),
      ])

      type DayAgg = {
        date: string
        revenue: number
        transactions: number
        bySource: { shop: number; tickets: number; hire: number; medals: number }
      }
      const byDay = new Map<string, DayAgg>()

      const ensure = (dateVal: Date | string): DayAgg => {
        const key = new Date(dateVal).toISOString().slice(0, 10)
        if (!byDay.has(key)) {
          byDay.set(key, {
            date: key,
            revenue: 0,
            transactions: 0,
            bySource: { shop: 0, tickets: 0, hire: 0, medals: 0 },
          })
        }
        return byDay.get(key)!
      }

      for (const row of orders) {
        const d = ensure(row.date)
        const rev = parseFloat(row.revenue)
        d.revenue += rev
        d.transactions += parseInt(row.txns)
        d.bySource.shop += rev
      }
      for (const row of tickets) {
        const d = ensure(row.date)
        const rev = parseFloat(row.revenue)
        d.revenue += rev
        d.transactions += parseInt(row.txns)
        d.bySource.tickets += rev
      }
      for (const row of hires) {
        const d = ensure(row.date)
        const rev = parseFloat(row.revenue)
        d.revenue += rev
        d.transactions += parseInt(row.txns)
        d.bySource.hire += rev
      }
      for (const row of medals) {
        const d = ensure(row.date)
        const rev = parseFloat(row.revenue)
        d.revenue += rev
        d.transactions += parseInt(row.txns)
        d.bySource.medals += rev
      }

      return res.json(
        Array.from(byDay.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((d) => ({
            date: d.date,
            revenue: parseFloat(d.revenue.toFixed(2)),
            transactions: d.transactions,
            bySource: {
              shop: parseFloat(d.bySource.shop.toFixed(2)),
              tickets: parseFloat(d.bySource.tickets.toFixed(2)),
              hire: parseFloat(d.bySource.hire.toFixed(2)),
              medals: parseFloat(d.bySource.medals.toFixed(2)),
            },
          }))
      )
    } catch (error: any) {
      console.error('Error in getRevenueTimeline:', error)
      return res.status(500).json({ error: 'Failed to fetch revenue timeline' })
    }
  },

  getTopProducts: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)
      const limit = parseInt(req.query.limit as string) || 10
      const d = dateRangeSql('o.created_at', range, 2)

      const result = await pool.query(
        `SELECT
          p.id,
          p.name,
          p.category,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue,
          COALESCE(SUM(oi.quantity), 0) as quantity_sold,
          MAX(o.created_at) as last_sold
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = $1${d.clause}
        GROUP BY p.id, p.name, p.category
        ORDER BY revenue DESC
        LIMIT $${d.nextIndex}`,
        ['paid', ...d.params, limit]
      )

      return res.json(
        result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          revenue: parseFloat(row.revenue),
          quantitySold: parseInt(row.quantity_sold),
          lastSold: row.last_sold,
        }))
      )
    } catch (error: any) {
      console.error('Error in getTopProducts:', error)
      return res.status(500).json({ error: 'Failed to fetch top products' })
    }
  },

  getRevenueByCategory: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)
      const d = dateRangeSql('o.created_at', range, 2)

      const result = await pool.query(
        `SELECT
          p.category,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue,
          COALESCE(SUM(oi.quantity), 0) as items_sold,
          COUNT(DISTINCT o.id) as orders
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = $1${d.clause}
        GROUP BY p.category
        ORDER BY revenue DESC`,
        ['paid', ...d.params]
      )

      return res.json(
        result.rows.map((row: any) => ({
          category: row.category,
          revenue: parseFloat(row.revenue),
          itemsSold: parseInt(row.items_sold),
          orders: parseInt(row.orders),
        }))
      )
    } catch (error: any) {
      console.error('Error in getRevenueByCategory:', error)
      return res.status(500).json({ error: 'Failed to fetch revenue by category' })
    }
  },

  getTopEvents: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)
      const limit = parseInt(req.query.limit as string) || 10
      const d = dateRangeSql('t.created_at', range, 2)

      const result = await pool.query(
        `SELECT
          e.id,
          e.title,
          e.capacity,
          COUNT(t.id) as tickets_sold,
          e.price as ticket_price,
          COALESCE(SUM(e.price), 0) as revenue,
          e.event_date
        FROM events e
        LEFT JOIN tickets t ON e.id = t.event_id AND t.payment_status = $1${d.clause}
        GROUP BY e.id, e.title, e.capacity, e.price, e.event_date
        ORDER BY tickets_sold DESC
        LIMIT $${d.nextIndex}`,
        ['paid', ...d.params, limit]
      )

      return res.json(
        result.rows.map((row: any) => ({
          id: row.id,
          name: row.title,
          capacity: parseInt(row.capacity),
          ticketsSold: parseInt(row.tickets_sold),
          ticketPrice: parseFloat(row.ticket_price),
          revenue: parseFloat(row.revenue),
          utilization:
            row.capacity > 0
              ? `${((parseInt(row.tickets_sold) / parseInt(row.capacity)) * 100).toFixed(1)}%`
              : '0%',
          eventDate: row.event_date,
        }))
      )
    } catch (error: any) {
      console.error('Error in getTopEvents:', error)
      return res.status(500).json({ error: 'Failed to fetch top events' })
    }
  },

  getPaymentStats: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)

      const fetchStatus = async (
        amountExpr: string,
        fromSql: string,
        statusCol: string,
        dateCol: string
      ) => {
        const d = dateRangeSql(dateCol, range, 1)
        const totalRes = await pool.query(
          `SELECT COUNT(*) as total, COALESCE(SUM(${amountExpr}), 0) as sum
           FROM ${fromSql}
           WHERE 1=1${d.clause}`,
          d.params
        )
        const statusRes = await pool.query(
          `SELECT ${statusCol} as payment_status, COUNT(*) as count, COALESCE(SUM(${amountExpr}), 0) as total
           FROM ${fromSql}
           WHERE 1=1${d.clause}
           GROUP BY ${statusCol}`,
          d.params
        )
        return { totalRes, statusRes }
      }

      const [orders, tickets, hires, medals] = await Promise.all([
        fetchStatus('total_amount', 'orders', 'payment_status', 'created_at'),
        fetchStatus('e.price', 'tickets t JOIN events e ON t.event_id = e.id', 't.payment_status', 't.created_at'),
        fetchStatus('total_cost', 'equipment_hire', 'payment_status', 'created_at'),
        fetchStatus(
          'o.price',
          'medal_purchases p JOIN medal_options o ON p.medal_option_id = o.id',
          'p.payment_status',
          'p.created_at'
        ),
      ])

      const total =
        parseInt(orders.totalRes.rows[0].total) +
        parseInt(tickets.totalRes.rows[0].total) +
        parseInt(hires.totalRes.rows[0].total) +
        parseInt(medals.totalRes.rows[0].total)
      const totalAmount =
        parseFloat(orders.totalRes.rows[0].sum) +
        parseFloat(tickets.totalRes.rows[0].sum) +
        parseFloat(hires.totalRes.rows[0].sum) +
        parseFloat(medals.totalRes.rows[0].sum)

      const statusBreakdown: Record<string, { count: number; total: number }> = {
        paid: { count: 0, total: 0 },
        pending: { count: 0, total: 0 },
        failed: { count: 0, total: 0 },
      }

      const mergeStatus = (rows: { payment_status: string; count: string; total: string }[]) => {
        rows.forEach((row) => {
          const key = row.payment_status
          if (!statusBreakdown[key]) {
            statusBreakdown[key] = { count: 0, total: 0 }
          }
          statusBreakdown[key].count += parseInt(row.count)
          statusBreakdown[key].total += parseFloat(row.total)
        })
      }

      mergeStatus(orders.statusRes.rows)
      mergeStatus(tickets.statusRes.rows)
      mergeStatus(hires.statusRes.rows)
      mergeStatus(medals.statusRes.rows)

      const successRate = total > 0 ? (statusBreakdown.paid.count / total) * 100 : 0
      const avgAmount = total > 0 ? totalAmount / total : 0

      return res.json({
        total,
        successful: statusBreakdown.paid.count,
        pending: statusBreakdown.pending.count,
        failed: statusBreakdown.failed.count,
        successRate: parseFloat(successRate.toFixed(1)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        avgAmount: parseFloat(avgAmount.toFixed(2)),
        breakdown: statusBreakdown,
      })
    } catch (error: any) {
      console.error('Error in getPaymentStats:', error)
      return res.status(500).json({ error: 'Failed to fetch payment stats' })
    }
  },

  getPaymentTimeline: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)

      const fetchDaily = async (fromSql: string, statusCol: string, dateCol: string) => {
        const d = dateRangeSql(dateCol, range, 1)
        return pool.query(
          `SELECT
            DATE_TRUNC('day', ${dateCol}) as date,
            COUNT(*) as total,
            SUM(CASE WHEN ${statusCol} = 'paid' THEN 1 ELSE 0 END) as successful,
            SUM(CASE WHEN ${statusCol} = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN ${statusCol} = 'pending' THEN 1 ELSE 0 END) as pending
           FROM ${fromSql}
           WHERE 1=1${d.clause}
           GROUP BY DATE_TRUNC('day', ${dateCol})`,
          d.params
        )
      }

      const [orders, tickets, hires, medals] = await Promise.all([
        fetchDaily('orders', 'payment_status', 'created_at'),
        fetchDaily('tickets t', 't.payment_status', 't.created_at'),
        fetchDaily('equipment_hire', 'payment_status', 'created_at'),
        fetchDaily('medal_purchases p', 'p.payment_status', 'p.created_at'),
      ])

      type Day = { date: string; total: number; successful: number; failed: number; pending: number }
      const byDay = new Map<string, Day>()
      const merge = (rows: any[]) => {
        for (const row of rows) {
          const key = new Date(row.date).toISOString().slice(0, 10)
          const cur = byDay.get(key) || { date: key, total: 0, successful: 0, failed: 0, pending: 0 }
          cur.total += parseInt(row.total) || 0
          cur.successful += parseInt(row.successful) || 0
          cur.failed += parseInt(row.failed) || 0
          cur.pending += parseInt(row.pending) || 0
          byDay.set(key, cur)
        }
      }
      merge(orders.rows)
      merge(tickets.rows)
      merge(hires.rows)
      merge(medals.rows)

      return res.json(Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)))
    } catch (error: any) {
      console.error('Error in getPaymentTimeline:', error)
      return res.status(500).json({ error: 'Failed to fetch payment timeline' })
    }
  },

  getUserStats: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)
      const d = dateRangeSql('created_at', range, 1)

      const [totalRes, periodRes, thisMonthRes, thisWeekRes, roleRes] = await Promise.all([
        pool.query('SELECT COUNT(*) as total FROM users'),
        pool.query(`SELECT COUNT(*) as total FROM users WHERE 1=1${d.clause}`, d.params),
        pool.query(
          `SELECT COUNT(*) as total FROM users
           WHERE created_at >= DATE_TRUNC('month', NOW())
           AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`
        ),
        pool.query(
          `SELECT COUNT(*) as total FROM users
           WHERE created_at >= DATE_TRUNC('week', NOW())
           AND created_at < DATE_TRUNC('week', NOW()) + INTERVAL '7 days'`
        ),
        pool.query(`SELECT role, COUNT(*) as count FROM users GROUP BY role`),
      ])

      const roleBreakdown: Record<string, number> = {}
      roleRes.rows.forEach((row: any) => {
        roleBreakdown[row.role] = parseInt(row.count)
      })

      return res.json({
        total: parseInt(totalRes.rows[0].total),
        inPeriod: parseInt(periodRes.rows[0].total),
        thisMonth: parseInt(thisMonthRes.rows[0].total),
        thisWeek: parseInt(thisWeekRes.rows[0].total),
        byRole: roleBreakdown,
      })
    } catch (error: any) {
      console.error('Error in getUserStats:', error)
      return res.status(500).json({ error: 'Failed to fetch user stats' })
    }
  },

  getUserGrowth: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)
      const d = dateRangeSql('created_at', range, 1)

      const result = await pool.query(
        `SELECT
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE 1=1${d.clause}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC`,
        d.params
      )

      let cumulativeBase = 0
      if (range.mode === 'days') {
        const before = await pool.query(
          `SELECT COUNT(*) as total FROM users WHERE created_at < NOW() - INTERVAL '1 days' * $1`,
          [range.days]
        )
        cumulativeBase = parseInt(before.rows[0].total)
      } else if (range.startDate) {
        const before = await pool.query(`SELECT COUNT(*) as total FROM users WHERE created_at < $1`, [
          range.startDate,
        ])
        cumulativeBase = parseInt(before.rows[0].total)
      }

      let running = cumulativeBase
      return res.json(
        result.rows.map((row: any) => {
          const newUsers = parseInt(row.new_users)
          running += newUsers
          return {
            date: row.date,
            newUsers,
            cumulative: running,
          }
        })
      )
    } catch (error: any) {
      console.error('Error in getUserGrowth:', error)
      return res.status(500).json({ error: 'Failed to fetch user growth' })
    }
  },

  getOrderStats: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)
      const d = dateRangeSql('created_at', range, 1)
      const dPaid = dateRangeSql('created_at', range, 2)

      const [totalRes, statusRes, avgRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total FROM orders WHERE 1=1${d.clause}`, d.params),
        pool.query(
          `SELECT status, COUNT(*) as count FROM (
            SELECT CASE WHEN payment_status = 'paid' THEN 'completed' ELSE 'pending' END as status
            FROM orders WHERE 1=1${d.clause}
          ) as order_status
          GROUP BY status`,
          d.params
        ),
        pool.query(
          `SELECT
            COALESCE(AVG(total_amount), 0) as avg_value,
            COALESCE(MAX(total_amount), 0) as max_value,
            COALESCE(MIN(total_amount), 0) as min_value
          FROM orders WHERE payment_status = $1${dPaid.clause}`,
          ['paid', ...dPaid.params]
        ),
      ])

      const statusBreakdown: Record<string, number> = { completed: 0, pending: 0 }
      statusRes.rows.forEach((row: any) => {
        statusBreakdown[row.status] = parseInt(row.count)
      })

      return res.json({
        total: parseInt(totalRes.rows[0].total),
        completed: statusBreakdown.completed || 0,
        pending: statusBreakdown.pending || 0,
        avgValue: parseFloat(avgRes.rows[0].avg_value),
        maxValue: parseFloat(avgRes.rows[0].max_value),
        minValue: parseFloat(avgRes.rows[0].min_value),
      })
    } catch (error: any) {
      console.error('Error in getOrderStats:', error)
      return res.status(500).json({ error: 'Failed to fetch order stats' })
    }
  },

  getEquipmentStats: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)
      const d = dateRangeSql('created_at', range, 2)

      const result = await pool.query(
        `SELECT
          equipment_name,
          COUNT(id) as rentals,
          COALESCE(SUM(CASE WHEN payment_status = $1 THEN total_cost ELSE 0 END), 0) as revenue,
          COALESCE(AVG(return_date - hire_date), 0) as avg_duration_days
        FROM equipment_hire
        WHERE equipment_name IS NOT NULL${d.clause}
        GROUP BY equipment_name
        ORDER BY revenue DESC`,
        ['paid', ...d.params]
      )

      return res.json(
        result.rows.map((row: any) => ({
          name: row.equipment_name,
          rentals: parseInt(row.rentals),
          revenue: parseFloat(row.revenue),
          avgDurationDays: parseFloat(Number(row.avg_duration_days).toFixed(1)),
        }))
      )
    } catch (error: any) {
      console.error('Error in getEquipmentStats:', error)
      return res.status(500).json({ error: 'Failed to fetch equipment stats' })
    }
  },

  getEventAttendance: async (req: Request, res: Response) => {
    try {
      const range = parseAnalyticsDateRange(req.query)
      const d = dateRangeSql('t.created_at', range, 2)

      const result = await pool.query(
        `SELECT
          e.id,
          e.title,
          e.capacity,
          COUNT(t.id) as tickets_sold,
          CASE WHEN e.capacity > 0
            THEN ROUND(100.0 * COUNT(t.id) / e.capacity, 1)
            ELSE 0
          END as utilization_percent,
          e.event_date
        FROM events e
        LEFT JOIN tickets t ON e.id = t.event_id AND t.payment_status = $1${d.clause}
        GROUP BY e.id, e.title, e.capacity, e.event_date
        ORDER BY utilization_percent DESC`,
        ['paid', ...d.params]
      )

      return res.json(
        result.rows.map((row: any) => ({
          id: row.id,
          name: row.title,
          capacity: parseInt(row.capacity),
          ticketsSold: parseInt(row.tickets_sold),
          utilization: `${row.utilization_percent}%`,
          eventDate: row.event_date,
        }))
      )
    } catch (error: any) {
      console.error('Error in getEventAttendance:', error)
      return res.status(500).json({ error: 'Failed to fetch event attendance' })
    }
  },
}
