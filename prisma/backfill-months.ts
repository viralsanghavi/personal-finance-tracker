import { prisma } from "../server/prisma"

const toMonth = (date: Date) => date.toISOString().slice(0, 7)

async function main() {
  const expenses = await prisma.expense.findMany()
  for (const expense of expenses) {
    const month = toMonth(expense.date ?? expense.createdAt)
    if (expense.month !== month) {
      await prisma.expense.update({ where: { id: expense.id }, data: { month } })
    }
  }

  const investments = await prisma.investment.findMany()
  for (const investment of investments) {
    const month = toMonth(investment.createdAt)
    if (investment.month !== month) {
      await prisma.investment.update({ where: { id: investment.id }, data: { month } })
    }
  }

  const loans = await prisma.loan.findMany()
  for (const loan of loans) {
    const month = toMonth(loan.dueDate ?? loan.createdAt)
    if (loan.month !== month) {
      await prisma.loan.update({ where: { id: loan.id }, data: { month } })
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
