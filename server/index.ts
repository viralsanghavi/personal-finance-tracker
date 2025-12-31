import express from "express"
import cors from "cors"
import { CategoryType, ExpenseType, LoanStatus } from "@prisma/client"
import { prisma } from "./prisma"

const app = express()

app.use(cors())
app.use(express.json())

const LLM_PROVIDER = process.env.LLM_PROVIDER || "ollama"
const AI_MODEL = process.env.AI_MODEL || "qwen2.5:7b"
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434"
const LLM_BASE_URL = process.env.LLM_BASE_URL || "http://127.0.0.1:11435/v1"
const LLM_MODEL = process.env.LLM_MODEL || (LLM_PROVIDER === "ollama" ? AI_MODEL : "local-model")

const normalizeCategoryType = (value: unknown): CategoryType => {
  if (typeof value !== "string") return CategoryType.NEED
  return value.toUpperCase() === "WANT" ? CategoryType.WANT : CategoryType.NEED
}

const normalizeExpenseType = (value: unknown): ExpenseType => {
  if (typeof value !== "string") return ExpenseType.NEED
  return value.toUpperCase() === "WANT" ? ExpenseType.WANT : ExpenseType.NEED
}

const normalizeLoanStatus = (value: unknown): LoanStatus => {
  if (typeof value !== "string") return LoanStatus.PENDING
  return value.toUpperCase() === "PAID" ? LoanStatus.PAID : LoanStatus.PENDING
}

const normalizeMonth = (value: unknown) => {
  if (typeof value !== "string" || value.length < 7) return new Date().toISOString().slice(0, 7)
  return value.slice(0, 7)
}

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number.parseFloat(String(value))
  return Number.isNaN(parsed) ? null : parsed
}

const toBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value
  if (typeof value === "string") return value.toLowerCase() === "true"
  return Boolean(value)
}

const safeJsonParse = (text: string) => {
  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")
  if (first === -1 || last === -1 || last <= first) return null
  try {
    return JSON.parse(text.slice(first, last + 1))
  } catch {
    return null
  }
}

const parseScheduleDay = (schedule: string | null | undefined) => {
  if (!schedule) return null
  const cleaned = schedule.toLowerCase()
  const match = cleaned.match(/\b(\d{1,2})(st|nd|rd|th)?\b/)
  if (!match) return null
  const day = Number.parseInt(match[1], 10)
  if (Number.isNaN(day) || day < 1 || day > 31) return null
  return day
}

const daysInMonth = (year: number, monthIndex: number) => {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

const getNextSipDate = (baseDate: Date, dayOfMonth: number) => {
  const year = baseDate.getUTCFullYear()
  const monthIndex = baseDate.getUTCMonth()
  const maxDay = daysInMonth(year, monthIndex)
  const targetDay = Math.min(dayOfMonth, maxDay)
  const target = new Date(Date.UTC(year, monthIndex, targetDay))
  if (target < baseDate) {
    const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1))
    const nextMaxDay = daysInMonth(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth())
    return new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), Math.min(dayOfMonth, nextMaxDay)))
  }
  return target
}

const toDateOnly = (value: string | undefined) => {
  if (!value) return new Date()
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return new Date()
  return parsed
}

const callOllama = async (messages: { role: string; content: string }[]) => {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.2,
      },
    }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Ollama error: ${errorText}`)
  }
  const data = (await response.json()) as { message?: { content?: string } }
  return data.message?.content ?? ""
}

const callOpenAiCompatible = async (messages: { role: string; content: string }[]) => {
  const base = LLM_BASE_URL.endsWith("/v1") ? LLM_BASE_URL : `${LLM_BASE_URL}/v1`
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: 0.2,
    }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LLM error: ${errorText}`)
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? ""
}

const callLLM = async (messages: { role: string; content: string }[]) => {
  if (LLM_PROVIDER === "ollama") {
    return callOllama(messages)
  }
  return callOpenAiCompatible(messages)
}

const buildSystemPrompt = (month: string, categories: { name: string; type: string }[]) => {
  const categoryList = categories.map((cat) => `${cat.name} (${cat.type})`).join(", ")
  return [
    "You are a local finance assistant. Convert user requests into a single JSON action.",
    "Only output JSON. No markdown, no extra text.",
    `Current month context: ${month}.`,
    "Resources and fields:",
    "expenses: id, categoryName, type(need|want), amount, description, date(YYYY-MM-DD), month(YYYY-MM)",
    "investments: id, name, purpose, amount, monthlyContribution, collectedAsOf, active, bank, schedule, isSip, month",
    "sips: same as investments, but isSip true",
    "loans: id, lender, amount, dueDate(YYYY-MM-DD), status(pending|paid), month",
    "settings: monthlyIncome",
    "emergencyFund: liquid, cash",
    "categories: id, name, type(need|want)",
    `Known categories: ${categoryList || "none"}.`,
    "Allowed actions: create, update, delete, list, query, answer.",
    "For create/update/delete, include resource and data. For update/delete, include id if available, else identify by name + month.",
    "For query/answer, include resource, operation(sum|avg|count|top|list), field, filters.",
    "If asked 'how much invested', set operation to sum and field to amount or monthlyContribution.",
    "For fund-specific questions, set filters.name to the fund name.",
    "If month is not specified in the user request, use the current month context.",
    "Always output a valid JSON object with keys: action, resource, data, filters, operation, field, limit.",
    "Never output {}. If unsure, set action to answer and resource to expenses with a clarification in data.note.",
  ].join("\n")
}

const buildRetryPrompt = () => {
  return [
    "Your last response was invalid.",
    "Return ONLY a JSON object with at least action and resource set.",
    "Do not return empty JSON.",
  ].join("\n")
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
  const category = await prisma.category.create({ data: { name, type: normalizeCategoryType(type) } })
  res.json(category)
})

app.put("/api/categories/:id", async (req, res) => {
  const { id } = req.params
  const { name, type } = req.body ?? {}
  const category = await prisma.category.update({ where: { id }, data: { name, type: normalizeCategoryType(type) } })
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
      type: normalizeExpenseType(type),
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
      type: normalizeExpenseType(type),
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
              interestRate: loan.interestRate,
              tenureMonths: loan.tenureMonths,
              startDate: loan.startDate,
              emi: loan.emi,
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
  const { lender, amount, interestRate, tenureMonths, startDate, emi, dueDate, status, month } = req.body ?? {}
  if (!lender || !amount || !dueDate || !status || !month) {
    res.status(400).json({ error: "lender, amount, dueDate, status, month are required" })
    return
  }
  const loan = await prisma.loan.create({
    data: {
      lender,
      amount: Number.parseInt(String(amount), 10),
      interestRate: interestRate === undefined ? null : toNumber(interestRate),
      tenureMonths: tenureMonths === undefined ? null : Number.parseInt(String(tenureMonths), 10),
      startDate: startDate ? new Date(startDate) : null,
      emi: emi === undefined ? null : Number.parseInt(String(emi), 10),
      dueDate: new Date(dueDate),
      status: normalizeLoanStatus(status),
      month,
    },
  })
  res.json(loan)
})

app.put("/api/loans/:id", async (req, res) => {
  const { id } = req.params
  const { lender, amount, interestRate, tenureMonths, startDate, emi, dueDate, status, month } = req.body ?? {}
  const loan = await prisma.loan.update({
    where: { id },
    data: {
      lender,
      amount: Number.parseInt(String(amount), 10),
      interestRate: interestRate === undefined ? undefined : toNumber(interestRate),
      tenureMonths: tenureMonths === undefined ? undefined : Number.parseInt(String(tenureMonths), 10),
      startDate: startDate === undefined ? undefined : startDate ? new Date(startDate) : null,
      emi: emi === undefined ? undefined : Number.parseInt(String(emi), 10),
      dueDate: new Date(dueDate),
      status: normalizeLoanStatus(status),
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

app.get("/api/sip-alerts", async (req, res) => {
  const dateParam = typeof req.query.date === "string" ? req.query.date : undefined
  const baseDate = toDateOnly(dateParam)
  const sipInvestments = await prisma.investment.findMany({
    where: {
      OR: [{ isSip: true }, { schedule: { contains: "month" } }, { schedule: { contains: "week" } }],
    },
  })

  const alerts = sipInvestments
    .map((investment) => {
      const day = parseScheduleDay(investment.schedule)
      if (!day) return null
      const dueDate = getNextSipDate(baseDate, day)
      const diffMs = dueDate.getTime() - baseDate.getTime()
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (daysLeft > 7) return null

      let severity = "upcoming"
      if (daysLeft === 0) severity = "today"
      else if (daysLeft <= 3) severity = "soon"

      return {
        id: investment.id,
        name: investment.name,
        monthlyContribution: investment.monthlyContribution,
        bank: investment.bank,
        schedule: investment.schedule,
        dueDate: dueDate.toISOString().slice(0, 10),
        daysLeft,
        severity,
        message:
          daysLeft === 0
            ? "SIP is due today. Check bank balance."
            : `SIP due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Check bank balance.`,
      }
    })
    .filter(Boolean)

  res.json(alerts)
})

app.post("/api/ai", async (req, res) => {
  try {
    const message = typeof req.body?.message === "string" ? req.body.message : ""
    if (!message) {
      res.status(400).json({ error: "message is required" })
      return
    }

    const currentMonth = normalizeMonth(req.body?.month)
    const categories = await prisma.category.findMany({ select: { id: true, name: true, type: true } })
    const systemPrompt = buildSystemPrompt(currentMonth, categories)

    let aiText = await callLLM([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ])

    let action = safeJsonParse(aiText)
    if (!action || !action.action || !action.resource) {
      aiText = await callLLM([
        { role: "system", content: systemPrompt },
        { role: "assistant", content: buildRetryPrompt() },
        { role: "user", content: message },
      ])
      action = safeJsonParse(aiText)
    }
    if (!action || !action.action || !action.resource) {
      res.status(400).json({ error: "Could not parse AI response", raw: aiText })
      return
    }

    const resource = String(action.resource).toLowerCase()
    const normalizedAction = String(action.action).toLowerCase()
    const filters = action.filters ?? {}
    const data = action.data ?? {}
    const limit = typeof action.limit === "number" ? action.limit : 10

    const resolveMonth = normalizeMonth(filters.month ?? data.month ?? currentMonth)

    const resolveCategory = async (categoryName: string, type: string) => {
      const existing = categories.find((cat) => cat.name.toLowerCase() === categoryName.toLowerCase())
      if (existing) return existing
      const created = await prisma.category.create({
        data: { name: categoryName, type: normalizeCategoryType(type) },
      })
      categories.push(created)
      return created
    }

    const buildExpenseWhere = (payload: any) => {
      const where: any = { month: resolveMonth }
      if (payload.type) where.type = normalizeExpenseType(payload.type)
      if (payload.categoryName) {
        where.category = { name: { contains: payload.categoryName } }
      }
      if (payload.description) {
        where.description = { contains: payload.description }
      }
      if (payload.min || payload.max) {
        where.amount = {}
        if (payload.min) where.amount.gte = toNumber(payload.min) ?? undefined
        if (payload.max) where.amount.lte = toNumber(payload.max) ?? undefined
      }
      return where
    }

    const buildInvestmentWhere = (payload: any) => {
      const where: any = { month: resolveMonth }
      if (payload.active !== undefined) where.active = toBoolean(payload.active)
      if (payload.name) where.name = { contains: payload.name }
      if (payload.purpose) where.purpose = { contains: payload.purpose }
      if (payload.isSip !== undefined) where.isSip = toBoolean(payload.isSip)
      return where
    }

    const buildLoanWhere = (payload: any) => {
      const where: any = { month: resolveMonth }
      if (payload.status) where.status = normalizeLoanStatus(payload.status)
      if (payload.lender) where.lender = { contains: payload.lender }
      return where
    }

    const replyPayload: { reply: string; data?: unknown } = { reply: "Done." }

    if (normalizedAction === "create") {
      if (resource === "expenses") {
        const categoryName = String(data.categoryName || data.category || "")
        const type = String(data.type || "need")
        const amount = toNumber(data.amount)
        if (!categoryName || amount === null) {
          res.status(400).json({ error: "categoryName and amount are required" })
          return
        }
        const category = await resolveCategory(categoryName, type)
        const expense = await prisma.expense.create({
          data: {
            categoryId: category.id,
            description: data.description || null,
            amount: Number.parseInt(String(amount), 10),
            type: normalizeExpenseType(type),
            date: data.date ? new Date(String(data.date)) : null,
            month: resolveMonth,
          },
          include: { category: true },
        })
        replyPayload.reply = `Created expense ${category.name} for ₹${expense.amount}.`
        replyPayload.data = expense
      } else if (resource === "investments" || resource === "sips") {
        const name = String(data.name || "")
        const amount = toNumber(data.amount)
        const monthlyContribution = toNumber(data.monthlyContribution ?? data.monthlySip ?? data.contribution)
        if (!name || amount === null || monthlyContribution === null) {
          res.status(400).json({ error: "name, amount, monthlyContribution are required" })
          return
        }
        const investment = await prisma.investment.create({
          data: {
            name,
            purpose: data.purpose || null,
            amount: Number.parseInt(String(amount), 10),
            monthlyContribution: Number.parseInt(String(monthlyContribution), 10),
            collectedAsOf: data.collectedAsOf ? Number.parseInt(String(data.collectedAsOf), 10) : null,
            active: data.active === undefined ? true : toBoolean(data.active),
            bank: data.bank || null,
            schedule: data.schedule || null,
            isSip: resource === "sips" ? true : toBoolean(data.isSip ?? false),
            month: resolveMonth,
          },
        })
        replyPayload.reply = `Created investment ${investment.name} for ₹${investment.amount}.`
        replyPayload.data = investment
      } else if (resource === "loans") {
        const lender = String(data.lender || "")
        const amount = toNumber(data.amount)
        if (!lender || amount === null || !data.dueDate || !data.status) {
          res.status(400).json({ error: "lender, amount, dueDate, status are required" })
          return
        }
        const loan = await prisma.loan.create({
          data: {
            lender,
            amount: Number.parseInt(String(amount), 10),
            dueDate: new Date(String(data.dueDate)),
            status: normalizeLoanStatus(data.status),
            month: resolveMonth,
          },
        })
        replyPayload.reply = `Created loan for ${loan.lender} (₹${loan.amount}).`
        replyPayload.data = loan
      } else if (resource === "settings") {
        const monthlyIncome = toNumber(data.monthlyIncome)
        if (monthlyIncome === null) {
          res.status(400).json({ error: "monthlyIncome is required" })
          return
        }
        const existing = await prisma.settings.findFirst()
        const settings = existing
          ? await prisma.settings.update({ where: { id: existing.id }, data: { monthlyIncome: Number.parseInt(String(monthlyIncome), 10) } })
          : await prisma.settings.create({ data: { monthlyIncome: Number.parseInt(String(monthlyIncome), 10) } })
        replyPayload.reply = `Updated monthly income to ₹${settings.monthlyIncome}.`
        replyPayload.data = settings
      } else if (resource === "emergencyfund") {
        const liquid = toNumber(data.liquid)
        const cash = toNumber(data.cash)
        if (liquid === null || cash === null) {
          res.status(400).json({ error: "liquid and cash are required" })
          return
        }
        const existing = await prisma.emergencyFund.findFirst()
        const fund = existing
          ? await prisma.emergencyFund.update({
              where: { id: existing.id },
              data: { liquid: Number.parseInt(String(liquid), 10), cash: Number.parseInt(String(cash), 10) },
            })
          : await prisma.emergencyFund.create({
              data: { liquid: Number.parseInt(String(liquid), 10), cash: Number.parseInt(String(cash), 10) },
            })
        replyPayload.reply = `Updated emergency fund to ₹${fund.liquid + fund.cash}.`
        replyPayload.data = fund
      } else if (resource === "categories") {
        const name = String(data.name || "")
        const type = String(data.type || "")
        if (!name || !type) {
          res.status(400).json({ error: "name and type are required" })
          return
        }
        const category = await prisma.category.create({ data: { name, type: normalizeCategoryType(type) } })
        replyPayload.reply = `Created category ${category.name}.`
        replyPayload.data = category
      }
    } else if (normalizedAction === "update") {
      if (resource === "expenses") {
        let targetId = data.id
        if (!targetId) {
          const matches = await prisma.expense.findMany({
            where: buildExpenseWhere({ ...filters, ...data }),
            include: { category: true },
            take: 2,
          })
          if (matches.length !== 1) {
            res.status(400).json({ error: "Provide a unique expense to update (use id or more filters)." })
            return
          }
          targetId = matches[0].id
        }
        let categoryId = data.categoryId
        if (!categoryId && data.categoryName) {
          const category = await resolveCategory(String(data.categoryName), String(data.type || "need"))
          categoryId = category.id
        }
        const amountValue = toNumber(data.amount)
        const expense = await prisma.expense.update({
          where: { id: targetId },
          data: {
            categoryId,
            description: data.description || null,
            amount: amountValue === null ? undefined : Number.parseInt(String(amountValue), 10),
            type: data.type ? normalizeExpenseType(data.type) : undefined,
            date: data.date ? new Date(String(data.date)) : undefined,
            month: data.month ? normalizeMonth(data.month) : undefined,
          },
          include: { category: true },
        })
        replyPayload.reply = "Updated expense."
        replyPayload.data = expense
      } else if (resource === "investments" || resource === "sips") {
        let targetId = data.id
        if (!targetId) {
          const matches = await prisma.investment.findMany({
            where: buildInvestmentWhere({ ...filters, ...data, isSip: resource === "sips" ? true : data.isSip }),
            take: 2,
          })
          if (matches.length !== 1) {
            res.status(400).json({ error: "Provide a unique investment to update (use id or more filters)." })
            return
          }
          targetId = matches[0].id
        }
        const amountValue = toNumber(data.amount)
        const monthlyContributionValue = toNumber(data.monthlyContribution)
        const collectedValue = data.collectedAsOf === undefined ? undefined : toNumber(data.collectedAsOf)
        const investment = await prisma.investment.update({
          where: { id: targetId },
          data: {
            name: data.name,
            purpose: data.purpose || null,
            amount: amountValue === null ? undefined : Number.parseInt(String(amountValue), 10),
            monthlyContribution:
              monthlyContributionValue === null ? undefined : Number.parseInt(String(monthlyContributionValue), 10),
            collectedAsOf:
              collectedValue === undefined
                ? undefined
                : collectedValue === null
                  ? null
                  : Number.parseInt(String(collectedValue), 10),
            active: data.active === undefined ? undefined : toBoolean(data.active),
            bank: data.bank || null,
            schedule: data.schedule || null,
            isSip: resource === "sips" ? true : data.isSip === undefined ? undefined : toBoolean(data.isSip),
            month: data.month ? normalizeMonth(data.month) : undefined,
          },
        })
        replyPayload.reply = `Updated investment ${investment.name}.`
        replyPayload.data = investment
      } else if (resource === "loans") {
        let targetId = data.id
        if (!targetId) {
          const matches = await prisma.loan.findMany({
            where: buildLoanWhere({ ...filters, ...data }),
            take: 2,
          })
          if (matches.length !== 1) {
            res.status(400).json({ error: "Provide a unique loan to update (use id or more filters)." })
            return
          }
          targetId = matches[0].id
        }
        const amountValue = toNumber(data.amount)
        const loan = await prisma.loan.update({
          where: { id: targetId },
          data: {
            lender: data.lender,
            amount: amountValue === null ? undefined : Number.parseInt(String(amountValue), 10),
            dueDate: data.dueDate ? new Date(String(data.dueDate)) : undefined,
            status: data.status ? normalizeLoanStatus(data.status) : undefined,
            month: data.month ? normalizeMonth(data.month) : undefined,
          },
        })
        replyPayload.reply = `Updated loan ${loan.lender}.`
        replyPayload.data = loan
      } else if (resource === "settings") {
        const monthlyIncome = toNumber(data.monthlyIncome)
        if (monthlyIncome === null) {
          res.status(400).json({ error: "monthlyIncome is required" })
          return
        }
        const existing = await prisma.settings.findFirst()
        const settings = existing
          ? await prisma.settings.update({ where: { id: existing.id }, data: { monthlyIncome: Number.parseInt(String(monthlyIncome), 10) } })
          : await prisma.settings.create({ data: { monthlyIncome: Number.parseInt(String(monthlyIncome), 10) } })
        replyPayload.reply = `Updated monthly income to ₹${settings.monthlyIncome}.`
        replyPayload.data = settings
      } else if (resource === "emergencyfund") {
        const liquid = toNumber(data.liquid)
        const cash = toNumber(data.cash)
        if (liquid === null || cash === null) {
          res.status(400).json({ error: "liquid and cash are required" })
          return
        }
        const existing = await prisma.emergencyFund.findFirst()
        if (!existing) {
          res.status(400).json({ error: "Emergency fund not found" })
          return
        }
        const fund = await prisma.emergencyFund.update({
          where: { id: existing.id },
          data: { liquid: Number.parseInt(String(liquid), 10), cash: Number.parseInt(String(cash), 10) },
        })
        replyPayload.reply = `Updated emergency fund to ₹${fund.liquid + fund.cash}.`
        replyPayload.data = fund
      } else if (resource === "categories") {
        let targetId = data.id
        if (!targetId && data.name) {
          const matches = await prisma.category.findMany({
            where: { name: { contains: String(data.name) } },
            take: 2,
          })
          if (matches.length !== 1) {
            res.status(400).json({ error: "Provide a unique category to update (use id or more filters)." })
            return
          }
          targetId = matches[0].id
        }
        const category = await prisma.category.update({
          where: { id: targetId },
          data: {
            name: data.name,
            type: data.type ? normalizeCategoryType(data.type) : undefined,
          },
        })
        replyPayload.reply = `Updated category ${category.name}.`
        replyPayload.data = category
      }
    } else if (normalizedAction === "delete") {
      if (resource === "expenses") {
        let targetId = data.id
        if (!targetId) {
          const matches = await prisma.expense.findMany({
            where: buildExpenseWhere({ ...filters, ...data }),
            take: 2,
          })
          if (matches.length !== 1) {
            res.status(400).json({ error: "Provide a unique expense to delete (use id or more filters)." })
            return
          }
          targetId = matches[0].id
        }
        await prisma.expense.delete({ where: { id: targetId } })
        replyPayload.reply = "Deleted expense."
      } else if (resource === "investments" || resource === "sips") {
        let targetId = data.id
        if (!targetId) {
          const matches = await prisma.investment.findMany({
            where: buildInvestmentWhere({ ...filters, ...data, isSip: resource === "sips" ? true : data.isSip }),
            take: 2,
          })
          if (matches.length !== 1) {
            res.status(400).json({ error: "Provide a unique investment to delete (use id or more filters)." })
            return
          }
          targetId = matches[0].id
        }
        await prisma.investment.delete({ where: { id: targetId } })
        replyPayload.reply = "Deleted investment."
      } else if (resource === "loans") {
        let targetId = data.id
        if (!targetId) {
          const matches = await prisma.loan.findMany({
            where: buildLoanWhere({ ...filters, ...data }),
            take: 2,
          })
          if (matches.length !== 1) {
            res.status(400).json({ error: "Provide a unique loan to delete (use id or more filters)." })
            return
          }
          targetId = matches[0].id
        }
        await prisma.loan.delete({ where: { id: targetId } })
        replyPayload.reply = "Deleted loan."
      } else if (resource === "categories") {
        let targetId = data.id
        if (!targetId && data.name) {
          const matches = await prisma.category.findMany({
            where: { name: { contains: String(data.name) } },
            take: 2,
          })
          if (matches.length !== 1) {
            res.status(400).json({ error: "Provide a unique category to delete (use id or more filters)." })
            return
          }
          targetId = matches[0].id
        }
        await prisma.category.delete({ where: { id: targetId } })
        replyPayload.reply = "Deleted category."
      }
    } else if (normalizedAction === "list") {
      if (resource === "expenses") {
        const items = await prisma.expense.findMany({
          where: buildExpenseWhere(filters),
          include: { category: true },
          orderBy: { amount: "desc" },
          take: limit,
        })
        replyPayload.reply = `Found ${items.length} expenses for ${resolveMonth}.`
        replyPayload.data = items
      } else if (resource === "investments" || resource === "sips") {
        const items = await prisma.investment.findMany({
          where: buildInvestmentWhere({ ...filters, isSip: resource === "sips" ? true : filters.isSip }),
          orderBy: { amount: "desc" },
          take: limit,
        })
        replyPayload.reply = `Found ${items.length} investments for ${resolveMonth}.`
        replyPayload.data = items
      } else if (resource === "loans") {
        const items = await prisma.loan.findMany({
          where: buildLoanWhere(filters),
          orderBy: { dueDate: "asc" },
          take: limit,
        })
        replyPayload.reply = `Found ${items.length} loans for ${resolveMonth}.`
        replyPayload.data = items
      }
    } else if (normalizedAction === "query" || normalizedAction === "answer") {
      if (resource === "expenses") {
        const items = await prisma.expense.findMany({
          where: buildExpenseWhere(filters),
          include: { category: true },
        })
        if (action.operation === "sum") {
          const total = items.reduce((sum, exp) => sum + exp.amount, 0)
          replyPayload.reply = `Total expenses: ₹${total.toLocaleString("en-IN")}.`
          replyPayload.data = { total }
        } else if (action.operation === "count") {
          replyPayload.reply = `Found ${items.length} expenses.`
          replyPayload.data = { count: items.length }
        } else if (action.operation === "top") {
          const top = items.sort((a, b) => b.amount - a.amount).slice(0, limit)
          replyPayload.reply = `Top ${top.length} expenses by amount.`
          replyPayload.data = top
        } else {
          replyPayload.reply = `Here are ${items.length} matching expenses.`
          replyPayload.data = items.slice(0, limit)
        }
      } else if (resource === "investments" || resource === "sips") {
        const items = await prisma.investment.findMany({
          where: buildInvestmentWhere({ ...filters, isSip: resource === "sips" ? true : filters.isSip }),
        })
        if (action.operation === "sum") {
          const field = String(action.field || "monthlyContribution")
          const total = items.reduce((sum, inv) => {
            if (field === "amount") return sum + inv.amount
            if (field === "collectedAsOf") return sum + (inv.collectedAsOf ?? 0)
            return sum + inv.monthlyContribution
          }, 0)
          const label =
            field === "amount"
              ? "Total invested amount"
              : field === "collectedAsOf"
                ? "Total collected as of"
                : "Total monthly contributions"
          replyPayload.reply = `${label}: ₹${total.toLocaleString("en-IN")}.`
          replyPayload.data = { total, field }
        } else if (action.operation === "count") {
          replyPayload.reply = `Found ${items.length} investments.`
          replyPayload.data = { count: items.length }
        } else {
          replyPayload.reply = `Here are ${items.length} matching investments.`
          replyPayload.data = items.slice(0, limit)
        }
      } else if (resource === "loans") {
        const items = await prisma.loan.findMany({
          where: buildLoanWhere(filters),
        })
        if (action.operation === "sum") {
          const total = items.reduce((sum, loan) => sum + loan.amount, 0)
          replyPayload.reply = `Total loans: ₹${total.toLocaleString("en-IN")}.`
          replyPayload.data = { total }
        } else if (action.operation === "count") {
          replyPayload.reply = `Found ${items.length} loans.`
          replyPayload.data = { count: items.length }
        } else {
          replyPayload.reply = `Here are ${items.length} matching loans.`
          replyPayload.data = items.slice(0, limit)
        }
      } else if (resource === "settings") {
        const settings = await prisma.settings.findFirst()
        replyPayload.reply = `Monthly income is ₹${settings?.monthlyIncome ?? 0}.`
        replyPayload.data = settings
      } else if (resource === "emergencyfund") {
        const fund = await prisma.emergencyFund.findFirst()
        const total = (fund?.liquid ?? 0) + (fund?.cash ?? 0)
        replyPayload.reply = `Emergency fund total is ₹${total.toLocaleString("en-IN")}.`
        replyPayload.data = fund
      }
    }

    res.json(replyPayload)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "AI request failed" })
  }
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: "Internal server error" })
})

const port = Number(process.env.PORT || 4200)
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
