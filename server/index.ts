import express from "express"
import cors from "cors"
import { prisma } from "./prisma"

const app = express()

app.use(cors())
app.use(express.json())

const normalizeEnum = (value: unknown) => {
  if (typeof value !== "string") return value
  return value.toUpperCase()
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" })
})

app.get("/api/settings", async (_req, res) => {
  const settings = await prisma.settings.findFirst()
  res.json(settings)
})

app.put("/api/settings", async (req, res) => {
  const monthlyIncome = Number.parseInt(String(req.body?.monthlyIncome ?? ""), 10)
  if (Number.isNaN(monthlyIncome)) {
    res.status(400).json({ error: "monthlyIncome is required" })
    return
  }

  const existing = await prisma.settings.findFirst()
  const settings = existing
    ? await prisma.settings.update({ where: { id: existing.id }, data: { monthlyIncome } })
    : await prisma.settings.create({ data: { monthlyIncome } })

  res.json(settings)
})

app.get("/api/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } })
  res.json(categories)
})

app.post("/api/categories", async (req, res) => {
  const { name, type } = req.body ?? {}
  if (!name || !type) {
    res.status(400).json({ error: "name and type are required" })
    return
  }
  const category = await prisma.category.create({ data: { name, type: normalizeEnum(type) } })
  res.json(category)
})

app.put("/api/categories/:id", async (req, res) => {
  const { id } = req.params
  const { name, type } = req.body ?? {}
  const category = await prisma.category.update({ where: { id }, data: { name, type: normalizeEnum(type) } })
  res.json(category)
})

app.delete("/api/categories/:id", async (req, res) => {
  const { id } = req.params
  await prisma.category.delete({ where: { id } })
  res.status(204).send()
})

app.get("/api/expenses", async (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : undefined
  const monthStart = month ? new Date(`${month}-01T00:00:00.000Z`) : null
  const monthEnd = monthStart ? new Date(monthStart) : null
  if (monthEnd) {
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1)
  }
  if (month) {
    const existing = await prisma.expense.findFirst({ where: { month } })
    if (!existing) {
      const latest = await prisma.expense.findFirst({ orderBy: { month: "desc" } })
      if (latest) {
        const sourceMonth = latest.month
        const sourceExpenses = await prisma.expense.findMany({ where: { month: sourceMonth } })
        if (sourceExpenses.length) {
          const monthDate = new Date(`${month}-01T00:00:00.000Z`)
          await prisma.expense.createMany({
            data: sourceExpenses.map((expense) => ({
              categoryId: expense.categoryId,
              description: expense.description,
              amount: expense.amount,
              type: expense.type,
              month,
              date: expense.date
                ? new Date(
                    monthDate.getFullYear(),
                    monthDate.getMonth(),
                    expense.date.getDate(),
                    expense.date.getHours(),
                    expense.date.getMinutes(),
                    expense.date.getSeconds(),
                    expense.date.getMilliseconds(),
                  )
                : null,
            })),
          })
        }
      }
    }
  }

  const where = month ? { month } : undefined

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { amount: "desc" },
  })
  res.json(expenses)
})

app.post("/api/expenses", async (req, res) => {
  const { categoryId, description, amount, type, date, month } = req.body ?? {}
  if (!categoryId || !amount || !type) {
    res.status(400).json({ error: "categoryId, amount, and type are required" })
    return
  }
  if (!month) {
    res.status(400).json({ error: "month is required" })
    return
  }
  const expense = await prisma.expense.create({
    data: {
      categoryId,
      description: description || null,
      amount: Number.parseInt(String(amount), 10),
      type: normalizeEnum(type),
      month,
      date: date ? new Date(date) : null,
    },
    include: { category: true },
  })
  res.json(expense)
})

app.put("/api/expenses/:id", async (req, res) => {
  const { id } = req.params
  const { categoryId, description, amount, type, date, month } = req.body ?? {}
  const expense = await prisma.expense.update({
    where: { id },
    data: {
      categoryId,
      description: description || null,
      amount: Number.parseInt(String(amount), 10),
      type: normalizeEnum(type),
      month,
      date: date ? new Date(date) : null,
    },
    include: { category: true },
  })
  res.json(expense)
})

app.delete("/api/expenses/:id", async (req, res) => {
  const { id } = req.params
  await prisma.expense.delete({ where: { id } })
  res.status(204).send()
})

app.get("/api/investments", async (_req, res) => {
  const month = typeof _req.query.month === "string" ? _req.query.month : undefined
  if (month) {
    const existing = await prisma.investment.findFirst({ where: { month } })
    if (!existing) {
      const latest = await prisma.investment.findFirst({ orderBy: { month: "desc" } })
      if (latest) {
        const source = await prisma.investment.findMany({ where: { month: latest.month } })
        if (source.length) {
          await prisma.investment.createMany({
            data: source.map((inv) => ({
              name: inv.name,
              amount: inv.amount,
              monthlyContribution: inv.monthlyContribution,
              month,
            })),
          })
        }
      }
    }
  }
  const investments = await prisma.investment.findMany({
    where: month ? { month } : undefined,
    orderBy: { amount: "desc" },
  })
  res.json(investments)
})

app.post("/api/investments", async (req, res) => {
  const { name, purpose, amount, monthlyContribution, collectedAsOf, active, bank, schedule, isSip, month } = req.body ?? {}
  if (!name || !amount || !monthlyContribution || !month) {
    res.status(400).json({ error: "name, amount, monthlyContribution, month are required" })
    return
  }
  const investment = await prisma.investment.create({
    data: {
      name,
      purpose: purpose || null,
      amount: Number.parseInt(String(amount), 10),
      monthlyContribution: Number.parseInt(String(monthlyContribution), 10),
      collectedAsOf: collectedAsOf === undefined || collectedAsOf === null ? null : Number.parseInt(String(collectedAsOf), 10),
      active: active === undefined ? true : Boolean(active),
      bank: bank || null,
      schedule: schedule || null,
      isSip: isSip === undefined ? false : Boolean(isSip),
      month,
    },
  })
  res.json(investment)
})

app.put("/api/investments/:id", async (req, res) => {
  const { id } = req.params
  const { name, purpose, amount, monthlyContribution, collectedAsOf, active, bank, schedule, isSip, month } = req.body ?? {}
  const investment = await prisma.investment.update({
    where: { id },
    data: {
      name,
      purpose: purpose || null,
      amount: Number.parseInt(String(amount), 10),
      monthlyContribution: Number.parseInt(String(monthlyContribution), 10),
      collectedAsOf: collectedAsOf === undefined || collectedAsOf === null ? null : Number.parseInt(String(collectedAsOf), 10),
      active: active === undefined ? undefined : Boolean(active),
      bank: bank || null,
      schedule: schedule || null,
      isSip: isSip === undefined ? undefined : Boolean(isSip),
      month,
    },
  })
  res.json(investment)
})

app.delete("/api/investments/:id", async (req, res) => {
  const { id } = req.params
  await prisma.investment.delete({ where: { id } })
  res.status(204).send()
})

app.get("/api/loans", async (_req, res) => {
  const month = typeof _req.query.month === "string" ? _req.query.month : undefined
  if (month) {
    const existing = await prisma.loan.findFirst({ where: { month } })
    if (!existing) {
      const latest = await prisma.loan.findFirst({ orderBy: { month: "desc" } })
      if (latest) {
        const source = await prisma.loan.findMany({ where: { month: latest.month } })
        if (source.length) {
          await prisma.loan.createMany({
            data: source.map((loan) => ({
              lender: loan.lender,
              amount: loan.amount,
              dueDate: loan.dueDate,
              status: loan.status,
              month,
            })),
          })
        }
      }
    }
  }
  const loans = await prisma.loan.findMany({
    where: month ? { month } : undefined,
    orderBy: { dueDate: "asc" },
  })
  res.json(loans)
})

app.post("/api/loans", async (req, res) => {
  const { lender, amount, dueDate, status, month } = req.body ?? {}
  if (!lender || !amount || !dueDate || !status || !month) {
    res.status(400).json({ error: "lender, amount, dueDate, status, month are required" })
    return
  }
  const loan = await prisma.loan.create({
    data: {
      lender,
      amount: Number.parseInt(String(amount), 10),
      dueDate: new Date(dueDate),
      status: normalizeEnum(status),
      month,
    },
  })
  res.json(loan)
})

app.put("/api/loans/:id", async (req, res) => {
  const { id } = req.params
  const { lender, amount, dueDate, status, month } = req.body ?? {}
  const loan = await prisma.loan.update({
    where: { id },
    data: {
      lender,
      amount: Number.parseInt(String(amount), 10),
      dueDate: new Date(dueDate),
      status: normalizeEnum(status),
      month,
    },
  })
  res.json(loan)
})

app.delete("/api/loans/:id", async (req, res) => {
  const { id } = req.params
  await prisma.loan.delete({ where: { id } })
  res.status(204).send()
})

app.get("/api/emergency-fund", async (_req, res) => {
  const fund = await prisma.emergencyFund.findFirst()
  res.json(fund)
})

app.put("/api/emergency-fund", async (req, res) => {
  const liquid = Number.parseInt(String(req.body?.liquid ?? ""), 10)
  const cash = Number.parseInt(String(req.body?.cash ?? ""), 10)
  if (Number.isNaN(liquid) || Number.isNaN(cash)) {
    res.status(400).json({ error: "liquid and cash are required" })
    return
  }

  const existing = await prisma.emergencyFund.findFirst()
  const fund = existing
    ? await prisma.emergencyFund.update({ where: { id: existing.id }, data: { liquid, cash } })
    : await prisma.emergencyFund.create({ data: { liquid, cash } })

  res.json(fund)
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: "Internal server error" })
})

const port = Number(process.env.PORT || 4200)
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
