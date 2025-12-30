import { prisma } from "../server/prisma"

const needs = [
  "Recharge",
  "Electricity",
  "Rent",
  "Fuel",
  "Wifi",
  "Rashan / DMart (Groceries)",
  "Building Maintenance",
  "Haircut",
  "Storage",
  "Health Insurance",
  "Term Insurance",
  "LIC",
  "Gym",
]

const wants = [
  "Netflix",
  "Movies",
  "Clothes",
  "Outside Food",
  "AI tools",
]

const expenses = [
  { name: "YT Music", amount: 200, type: "WANT" },
  { name: "Netflix", amount: 600, type: "WANT" },
  { name: "Recharge", amount: 350, type: "NEED" },
  { name: "Clothes", amount: 12000, type: "WANT" },
  { name: "Electricity", amount: 5000, type: "NEED" },
  { name: "Haircut", amount: 500, type: "NEED" },
  { name: "Storage", amount: 150, type: "NEED" },
  { name: "Fuel", amount: 10000, type: "NEED" },
  { name: "Movies", amount: 1250, type: "WANT" },
  { name: "Gym", amount: 583, type: "NEED" },
  { name: "Rent", amount: 50000, type: "NEED" },
  { name: "Outside Food", amount: 8000, type: "WANT" },
  { name: "Wifi", amount: 500, type: "NEED" },
  { name: "Rashan like dmart", amount: 0, type: "NEED" },
  { name: "AI", amount: 2000, type: "WANT" },
  { name: "Building maintenance", amount: 0, type: "NEED" },
]

const investments = [
  { name: "LIC", monthlyContribution: 3100 },
  { name: "PPF", monthlyContribution: 0 },
  { name: "SIP", monthlyContribution: 114300 },
  { name: "Health Insurance", monthlyContribution: 1500 },
  { name: "Term Insurance", monthlyContribution: 3500 },
]

const sipInvestments = [
  { purpose: "Investment", name: "Parag Parikh Flexi Cap Fund", monthlyContribution: 25000 },
  { purpose: "Investment", name: "HDFC Flexi Cap Fund", monthlyContribution: 25000 },
  { purpose: "LIC Liquid", name: "ICICI Prudential Liquid Fund", monthlyContribution: 9300 },
  { purpose: "Investment", name: "Canara Robeco Small Cap Fund", monthlyContribution: 10000 },
  { purpose: "Investment", name: "Edelweiss Mid Cap Fund", monthlyContribution: 10000 },
  { purpose: "Investment", name: "UTI Nifty50", monthlyContribution: 20000 },
  { purpose: "Investment", name: "UTI NiftyNext50", monthlyContribution: 10000 },
  { purpose: "HEALTH INSURANCE Investment", name: "UTI Nifty50", monthlyContribution: 3500 },
  { purpose: "Term Insurance Investment", name: "UTI Nifty50", monthlyContribution: 1500 },
]

async function main() {
  for (const name of needs) {
    await prisma.category.upsert({
      where: { name },
      update: { type: "NEED" },
      create: { name, type: "NEED" },
    })
  }

  for (const name of wants) {
    await prisma.category.upsert({
      where: { name },
      update: { type: "WANT" },
      create: { name, type: "WANT" },
    })
  }

  const month = new Date().toISOString().slice(0, 7)

  for (const expense of expenses) {
    const category = await prisma.category.upsert({
      where: { name: expense.name },
      update: { type: expense.type },
      create: { name: expense.name, type: expense.type },
    })

    const existing = await prisma.expense.findFirst({
      where: {
        month,
        categoryId: category.id,
        amount: expense.amount,
      },
    })
    if (!existing) {
      await prisma.expense.create({
        data: {
          categoryId: category.id,
          amount: expense.amount,
          type: expense.type,
          month,
        },
      })
    }
  }

  for (const investment of investments) {
    const existing = await prisma.investment.findFirst({
      where: {
        month,
        name: investment.name,
        monthlyContribution: investment.monthlyContribution,
      },
    })
    if (!existing) {
      await prisma.investment.create({
        data: {
          name: investment.name,
          amount: investment.monthlyContribution,
          monthlyContribution: investment.monthlyContribution,
          month,
        },
      })
    }
  }

  for (const sip of sipInvestments) {
    const existing = await prisma.investment.findFirst({
      where: {
        month,
        name: sip.name,
        monthlyContribution: sip.monthlyContribution,
        purpose: sip.purpose,
      },
    })
    if (!existing) {
      await prisma.investment.create({
        data: {
          name: sip.name,
          purpose: sip.purpose,
          amount: sip.monthlyContribution,
          monthlyContribution: sip.monthlyContribution,
          month,
          isSip: true,
        },
      })
    }
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
