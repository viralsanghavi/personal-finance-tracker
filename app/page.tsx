"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts"
import {
  IndianRupee,
  TrendingUp,
  Wallet,
  PiggyBank,
  CreditCard,
  Trash2,
  Plus,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  Tags,
  Settings,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  type: "need" | "want"
  date: string
}

interface Investment {
  id: string
  name: string
  amount: number
  monthlyContribution: number
}

interface Loan {
  id: string
  lender: string
  amount: number
  dueDate: string
  status: "pending" | "paid"
}

interface Category {
  id: string
  name: string
  type: "need" | "want"
}

export default function FinanceTracker() {
  const [monthlyIncome, setMonthlyIncome] = useState(155400)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ amount: 155400 }) // Initialize with current monthlyIncome

  const [categories, setCategories] = useState<Category[]>([
    { id: "1", name: "Rent", type: "need" },
    { id: "2", name: "Utilities", type: "need" },
    { id: "3", name: "Food", type: "need" },
    { id: "4", name: "Entertainment", type: "want" },
    { id: "5", name: "Transportation", type: "need" },
    { id: "6", name: "Shopping", type: "want" },
  ])

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "need" as "need" | "want",
  })

  const [expenses, setExpenses] = useState<Expense[]>([])

  const [investments, setInvestments] = useState<Investment[]>([])
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [investmentForm, setInvestmentForm] = useState({
    name: "",
    amount: "",
    monthlyContribution: "",
  })

  const [emergencyFund, setEmergencyFund] = useState({
    liquid: 0,
    cash: 0,
    total: 0,
    target6X: 0, // Initialize with 0, will be set by useEffect
    target12X: 0, // Initialize with 0, will be set by useEffect
  })

  const [loanDialogOpen, setLoanDialogOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [loanForm, setLoanForm] = useState({
    lender: "",
    amount: "",
    dueDate: "",
    status: "pending" as "pending" | "paid",
  })

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseForm, setExpenseForm] = useState({
    category: "",
    description: "",
    amount: "",
    type: "need" as "need" | "want",
    date: new Date().toISOString().split("T")[0],
  })

  const [loans, setLoans] = useState<Loan[]>([]) // Added setLoans and loans state

  useEffect(() => {
    setEmergencyFund((prev) => ({
      ...prev,
      target6X: monthlyIncome * 6,
      target12X: monthlyIncome * 12,
    }))
  }, [monthlyIncome])

  useEffect(() => {
    setEmergencyFund((prev) => ({
      ...prev,
      total: prev.liquid + prev.cash,
    }))
  }, [emergencyFund.liquid, emergencyFund.cash])

  const [emergencyFundDialogOpen, setEmergencyFundDialogOpen] = useState(false)
  const [emergencyFundForm, setEmergencyFundForm] = useState({
    liquid: 0,
    cash: 0,
  })

  const handleEditEmergencyFund = () => {
    setEmergencyFundForm({
      liquid: emergencyFund.liquid,
      cash: emergencyFund.cash,
    })
    setEmergencyFundDialogOpen(true)
  }

  const handleSaveEmergencyFund = () => {
    setEmergencyFund((prev) => ({
      ...prev,
      liquid: emergencyFundForm.liquid,
      cash: emergencyFundForm.cash,
    }))
    setEmergencyFundDialogOpen(false)
  }

  const handleSaveIncome = () => {
    setMonthlyIncome(incomeForm.amount)
    setSettingsDialogOpen(false)
  }

  const openSettingsDialog = () => {
    setIncomeForm({ amount: monthlyIncome })
    setSettingsDialogOpen(true)
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => exp.date.startsWith(selectedMonth))
  }, [expenses, selectedMonth])

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const totalNeeds = filteredExpenses.filter((e) => e.type === "need").reduce((sum, exp) => sum + exp.amount, 0)
  const totalWants = filteredExpenses.filter((e) => e.type === "want").reduce((sum, exp) => sum + exp.amount, 0)
  const totalInvestments = investments.reduce((sum, inv) => sum + inv.monthlyContribution, 0)
  const remaining = monthlyIncome - totalExpenses - totalInvestments

  const monthlyHistory = useMemo(() => {
    const monthsMap = new Map<string, { expenses: number; investments: number; needs: number; wants: number }>()

    expenses.forEach((exp) => {
      const month = exp.date.slice(0, 7)
      if (!monthsMap.has(month)) {
        // Ensure investments are correctly accounted for each month in history
        // For simplicity, using totalInvestments here, but a more granular approach might be needed if investments change monthly.
        monthsMap.set(month, { expenses: 0, investments: totalInvestments, needs: 0, wants: 0 })
      }
      const data = monthsMap.get(month)!
      data.expenses += exp.amount
      if (exp.type === "need") data.needs += exp.amount
      else data.wants += exp.amount
    })

    return Array.from(monthsMap.entries())
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        expenses: data.expenses,
        investments: data.investments,
        needs: data.needs,
        wants: data.wants,
      }))
      .sort((a, b) => {
        // Custom sort to ensure chronological order of months
        const dateA = new Date(a.month.replace(" ", ", "))
        const dateB = new Date(b.month.replace(" ", ", "))
        return dateA.getTime() - dateB.getTime()
      })
      .slice(-6)
  }, [expenses, totalInvestments])

  const budgetData = [
    { name: "Investments", value: totalInvestments, color: "hsl(var(--chart-1))" },
    { name: "Needs", value: totalNeeds, color: "hsl(var(--chart-2))" },
    { name: "Wants", value: totalWants, color: "hsl(var(--chart-3))" },
    { name: "Remaining", value: remaining, color: "hsl(var(--chart-4))" },
  ]

  const expensesByCategory = filteredExpenses.reduce(
    (acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    },
    {} as Record<string, number>,
  )

  const categoryChartData = Object.entries(expensesByCategory).map(([name, amount]) => ({
    name,
    amount,
  }))

  const handlePreviousMonth = () => {
    const date = new Date(selectedMonth + "-01")
    date.setMonth(date.getMonth() - 1)
    setSelectedMonth(date.toISOString().slice(0, 7))
  }

  const handleNextMonth = () => {
    const date = new Date(selectedMonth + "-01")
    date.setMonth(date.getMonth() + 1)
    setSelectedMonth(date.toISOString().slice(0, 7))
  }

  const handleCurrentMonth = () => {
    setSelectedMonth(new Date().toISOString().slice(0, 7))
  }

  const selectedMonthName = new Date(selectedMonth + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const handleAddExpense = () => {
    setEditingExpense(null)
    setExpenseForm({
      category: "",
      description: "",
      amount: "",
      type: "need",
      date: new Date().toISOString().split("T")[0],
    })
    setExpenseDialogOpen(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseForm({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      type: expense.type,
      date: expense.date,
    })
    setExpenseDialogOpen(true)
  }

  const handleSaveExpense = () => {
    if (!expenseForm.category || !expenseForm.amount) return

    if (editingExpense) {
      setExpenses(
        expenses.map((exp) =>
          exp.id === editingExpense.id
            ? {
                ...exp,
                category: expenseForm.category,
                description: expenseForm.description,
                amount: Number.parseFloat(expenseForm.amount),
                type: expenseForm.type,
                date: expenseForm.date,
              }
            : exp,
        ),
      )
    } else {
      const newExpense: Expense = {
        id: Date.now().toString(),
        category: expenseForm.category,
        description: expenseForm.description,
        amount: Number.parseFloat(expenseForm.amount),
        type: expenseForm.type,
        date: expenseForm.date,
      }
      setExpenses([...expenses, newExpense])
    }
    setExpenseDialogOpen(false)
  }

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id))
  }

  const handleAddInvestment = () => {
    setEditingInvestment(null)
    setInvestmentForm({
      name: "",
      amount: "",
      monthlyContribution: "",
    })
    setInvestmentDialogOpen(true)
  }

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment)
    setInvestmentForm({
      name: investment.name,
      amount: investment.amount.toString(),
      monthlyContribution: investment.monthlyContribution.toString(),
    })
    setInvestmentDialogOpen(true)
  }

  const handleSaveInvestment = () => {
    if (!investmentForm.name || !investmentForm.amount || !investmentForm.monthlyContribution) return

    if (editingInvestment) {
      setInvestments(
        investments.map((inv) =>
          inv.id === editingInvestment.id
            ? {
                ...inv,
                name: investmentForm.name,
                amount: Number.parseFloat(investmentForm.amount),
                monthlyContribution: Number.parseFloat(investmentForm.monthlyContribution),
              }
            : inv,
        ),
      )
    } else {
      const newInvestment: Investment = {
        id: Date.now().toString(),
        name: investmentForm.name,
        amount: Number.parseFloat(investmentForm.amount),
        monthlyContribution: Number.parseFloat(investmentForm.monthlyContribution),
      }
      setInvestments([...investments, newInvestment])
    }
    setInvestmentDialogOpen(false)
  }

  const handleDeleteInvestment = (id: string) => {
    setInvestments(investments.filter((inv) => inv.id !== id))
  }

  const handleAddLoan = () => {
    setEditingLoan(null)
    setLoanForm({
      lender: "",
      amount: "",
      dueDate: "",
      status: "pending",
    })
    setLoanDialogOpen(true)
  }

  const handleEditLoan = (loan: Loan) => {
    setEditingLoan(loan)
    setLoanForm({
      lender: loan.lender,
      amount: loan.amount.toString(),
      dueDate: loan.dueDate,
      status: loan.status,
    })
    setLoanDialogOpen(true)
  }

  const handleSaveLoan = () => {
    if (!loanForm.lender || !loanForm.amount || !loanForm.dueDate) return

    if (editingLoan) {
      setLoans(
        loans.map((loan) =>
          loan.id === editingLoan.id
            ? {
                ...loan,
                lender: loanForm.lender,
                amount: Number.parseFloat(loanForm.amount),
                dueDate: loanForm.dueDate,
                status: loanForm.status,
              }
            : loan,
        ),
      )
    } else {
      const newLoan: Loan = {
        id: Date.now().toString(),
        lender: loanForm.lender,
        amount: Number.parseFloat(loanForm.amount),
        dueDate: loanForm.dueDate,
        status: loanForm.status,
      }
      setLoans([...loans, newLoan])
    }
    setLoanDialogOpen(false)
  }

  const handleDeleteLoan = (id: string) => {
    setLoans(loans.filter((loan) => loan.id !== id))
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setCategoryForm({
      name: "",
      type: "need",
    })
    setCategoryDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name,
      type: category.type,
    })
    setCategoryDialogOpen(true)
  }

  const handleSaveCategory = () => {
    if (!categoryForm.name) return

    if (editingCategory) {
      setCategories(
        categories.map((cat) =>
          cat.id === editingCategory.id
            ? {
                ...cat,
                name: categoryForm.name,
                type: categoryForm.type,
              }
            : cat,
        ),
      )
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: categoryForm.name,
        type: categoryForm.type,
      }
      setCategories([...categories, newCategory])
    }
    setCategoryDialogOpen(false)
  }

  const handleDeleteCategory = (id: string) => {
    const category = categories.find((c) => c.id === id)
    if (!category) return

    const isUsed = expenses.some((exp) => exp.category === category.name)
    if (isUsed) {
      alert("Cannot delete category that is being used by expenses")
      return
    }

    setCategories(categories.filter((cat) => cat.id !== id))
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportExpenses = () => {
    const exportData = filteredExpenses.map((exp) => ({
      Date: exp.date,
      Category: exp.category,
      Description: exp.description,
      Amount: exp.amount,
      Type: exp.type,
    }))
    exportToCSV(exportData, `expenses-${selectedMonth}.csv`)
  }

  const handleExportInvestments = () => {
    const exportData = investments.map((inv) => ({
      Name: inv.name,
      "Total Amount": inv.amount,
      "Monthly Contribution": inv.monthlyContribution,
    }))
    exportToCSV(exportData, `investments-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const handleExportLoans = () => {
    const exportData = loans.map((loan) => ({
      Lender: loan.lender,
      Amount: loan.amount,
      "Due Date": loan.dueDate,
      Status: loan.status,
    }))
    exportToCSV(exportData, `loans-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const handleExportMonthlyReport = () => {
    const reportData = [
      { Category: "Monthly Income", Amount: monthlyIncome },
      { Category: "Total Expenses", Amount: totalExpenses },
      { Category: "Needs", Amount: totalNeeds },
      { Category: "Wants", Amount: totalWants },
      { Category: "Investments", Amount: totalInvestments },
      { Category: "Remaining", Amount: remaining },
      { Category: "", Amount: "" },
      { Category: "Emergency Fund Total", Amount: emergencyFund.total },
      { Category: "Emergency Fund 6X Target", Amount: emergencyFund.target6X },
      { Category: "Emergency Fund 12X Target", Amount: emergencyFund.target12X },
    ]
    exportToCSV(reportData, `monthly-report-${selectedMonth}.csv`)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-foreground/10 p-2">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-primary-foreground">Finance Tracker</h1>
                <p className="text-xs md:text-sm text-primary-foreground/80">Manage your budget and investments</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap md:flex-nowrap">
              <Button
                variant="outline"
                size="sm"
                onClick={openSettingsDialog}
                className="w-full sm:w-auto bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportMonthlyReport}>Monthly Report</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExpenses}>Expenses (CSV)</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportInvestments}>Investments (CSV)</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportLoans}>Loans (CSV)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="text-left sm:text-right border-t border-primary-foreground/20 sm:border-t-0 pt-3 sm:pt-0">
                <p className="text-xs md:text-sm text-primary-foreground/80">Monthly Income</p>
                <p className="text-2xl md:text-3xl font-bold text-primary-foreground flex items-center gap-1">
                  <IndianRupee className="w-5 h-5 md:w-6 md:h-6" />
                  {monthlyIncome.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={handlePreviousMonth} className="w-full sm:w-auto bg-transparent">
            <ChevronLeft className="h-4 w-4" />
            <span className="sm:hidden">Previous</span>
          </Button>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-base sm:text-lg font-semibold text-primary">{selectedMonthName}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleNextMonth} className="w-full sm:w-auto bg-transparent">
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleCurrentMonth} className="w-full sm:w-auto bg-transparent">
            Current Month
          </Button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-primary/10">
              <CardTitle className="text-sm font-medium text-primary">Total Expenses</CardTitle>
              <CreditCard className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {totalExpenses.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Needs: ₹{totalNeeds.toLocaleString("en-IN")} | Wants: ₹{totalWants.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-primary/10">
              <CardTitle className="text-sm font-medium text-primary">Investments</CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {totalInvestments.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{investments.length} active investments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-primary/10">
              <CardTitle className="text-sm font-medium text-primary">Remaining</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {remaining.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((remaining / monthlyIncome) * 100).toFixed(1)}% of income
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-primary/10">
              <CardTitle className="text-sm font-medium text-primary">Emergency Fund</CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {emergencyFund.total.toLocaleString("en-IN")}
              </div>
              <div className="mt-2">
                <Progress value={(emergencyFund.total / emergencyFund.target6X) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {((emergencyFund.total / emergencyFund.target6X) * 100).toFixed(1)}% of 6X target
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleEditEmergencyFund} className="mt-2 w-full text-primary">
                <Pencil className="h-3 w-3 mr-1" />
                Update Fund
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Fund</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {/* Add Categories tab trigger */}
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Allocation</CardTitle>
                  <CardDescription>Monthly income distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={budgetData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {budgetData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                  <CardDescription>Breakdown of spending</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                      <Bar dataKey="amount" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Budget Summary</CardTitle>
                <CardDescription>40/45/15 allocation guideline</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Investments (Target: 40%)</span>
                    <span className="font-medium">
                      ₹{totalInvestments.toLocaleString("en-IN")} (
                      {((totalInvestments / monthlyIncome) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={(totalInvestments / (monthlyIncome * 0.4)) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Needs (Target: 45%)</span>
                    <span className="font-medium">
                      ₹{totalNeeds.toLocaleString("en-IN")} ({((totalNeeds / monthlyIncome) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={(totalNeeds / (monthlyIncome * 0.45)) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Wants (Target: 15%)</span>
                    <span className="font-medium">
                      ₹{totalWants.toLocaleString("en-IN")} ({((totalWants / monthlyIncome) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={(totalWants / (monthlyIncome * 0.15)) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Expense List</CardTitle>
                    <CardDescription>Track all your spending</CardDescription>
                  </div>
                  <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddExpense}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Expense
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
                        <DialogDescription>
                          {editingExpense ? "Update expense details" : "Enter details for your new expense"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={expenseForm.category}
                            onValueChange={(value) => {
                              const selectedCategory = categories.find((c) => c.name === value)
                              setExpenseForm({
                                ...expenseForm,
                                category: value,
                                type: selectedCategory?.type || "need",
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.name}>
                                  {cat.name} ({cat.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Input
                            id="description"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            placeholder="Optional description"
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="type">Type</Label>
                          <Select
                            value={expenseForm.type}
                            onValueChange={(value: "need" | "want") => setExpenseForm({ ...expenseForm, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="need">Need</SelectItem>
                              <SelectItem value="want">Want</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="date">Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveExpense}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{expense.category}</p>
                          <Badge variant={expense.type === "need" ? "default" : "secondary"}>{expense.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{expense.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{expense.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold flex items-center">
                          <IndianRupee className="w-4 h-4" />
                          {expense.amount.toLocaleString("en-IN")}
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No expenses for this month</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Investment Portfolio</CardTitle>
                    <CardDescription>Your investment accounts and contributions</CardDescription>
                  </div>
                  <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddInvestment}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Investment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingInvestment ? "Edit Investment" : "Add New Investment"}</DialogTitle>
                        <DialogDescription>
                          {editingInvestment ? "Update investment details" : "Enter details for your new investment"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="inv-name">Investment Name</Label>
                          <Input
                            id="inv-name"
                            value={investmentForm.name}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })}
                            placeholder="e.g., LIC, SIP, Insurance"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inv-amount">Total Amount</Label>
                          <Input
                            id="inv-amount"
                            type="number"
                            value={investmentForm.amount}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inv-monthly">Monthly Contribution</Label>
                          <Input
                            id="inv-monthly"
                            type="number"
                            value={investmentForm.monthlyContribution}
                            onChange={(e) =>
                              setInvestmentForm({ ...investmentForm, monthlyContribution: e.target.value })
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setInvestmentDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveInvestment}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {investments.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{investment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Monthly: ₹{investment.monthlyContribution.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold flex items-center">
                          <IndianRupee className="w-4 h-4" />
                          {investment.amount.toLocaleString("en-IN")}
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => handleEditInvestment(investment)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteInvestment(investment.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Total Portfolio Value</p>
                      <p className="text-2xl font-bold flex items-center text-primary">
                        <IndianRupee className="w-5 h-5" />
                        {investments.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Emergency Fund Progress</CardTitle>
                    <CardDescription>Building your financial safety net</CardDescription>
                  </div>
                  <Button onClick={handleEditEmergencyFund}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Update Fund
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">Liquid Assets</p>
                    <p className="text-2xl font-bold flex items-center mt-1">
                      <IndianRupee className="w-5 h-5" />
                      {emergencyFund.liquid.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="p-4 border border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">Cash</p>
                    <p className="text-2xl font-bold flex items-center mt-1">
                      <IndianRupee className="w-5 h-5" />
                      {emergencyFund.cash.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">6X Target Progress</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{emergencyFund.total.toLocaleString("en-IN")} / ₹{emergencyFund.target6X.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Progress
                    value={emergencyFund.target6X > 0 ? (emergencyFund.total / emergencyFund.target6X) * 100 : 0}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {emergencyFund.target6X > 0 ? ((emergencyFund.total / emergencyFund.target6X) * 100).toFixed(1) : 0}
                    % complete
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">12X Target Progress</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{emergencyFund.total.toLocaleString("en-IN")} / ₹
                      {emergencyFund.target12X.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Progress
                    value={emergencyFund.target12X > 0 ? (emergencyFund.total / emergencyFund.target12X) * 100 : 0}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {emergencyFund.target12X > 0
                      ? ((emergencyFund.total / emergencyFund.target12X) * 100).toFixed(1)
                      : 0}
                    % complete
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Loan Payments</CardTitle>
                    <CardDescription>Track amounts owed and due dates</CardDescription>
                  </div>
                  <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddLoan}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Loan
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingLoan ? "Edit Loan" : "Add New Loan"}</DialogTitle>
                        <DialogDescription>
                          {editingLoan ? "Update loan details" : "Enter details for your new loan"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="lender">Lender</Label>
                          <Input
                            id="lender"
                            value={loanForm.lender}
                            onChange={(e) => setLoanForm({ ...loanForm, lender: e.target.value })}
                            placeholder="e.g., Mom, Jay, Bank"
                          />
                        </div>
                        <div>
                          <Label htmlFor="loan-amount">Amount</Label>
                          <Input
                            id="loan-amount"
                            type="number"
                            value={loanForm.amount}
                            onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="due-date">Due Date</Label>
                          <Input
                            id="due-date"
                            type="date"
                            value={loanForm.dueDate}
                            onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={loanForm.status}
                            onValueChange={(value: "pending" | "paid") => setLoanForm({ ...loanForm, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLoanDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveLoan}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loans.map((loan) => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{loan.lender}</p>
                        <p className="text-sm text-muted-foreground">Due: {loan.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={loan.status === "pending" ? "destructive" : "default"}>{loan.status}</Badge>
                        <p className="font-bold flex items-center">
                          <IndianRupee className="w-4 h-4" />
                          {loan.amount.toLocaleString("en-IN")}
                        </p>
                        <Button variant="ghost" size="icon" onClick={() => handleEditLoan(loan)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLoan(loan.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Track your spending and investment patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="hsl(var(--chart-2))"
                      name="Total Expenses"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="investments"
                      stroke="hsl(var(--chart-1))"
                      name="Investments"
                      strokeWidth={2}
                    />
                    <Line type="monotone" dataKey="needs" stroke="hsl(var(--chart-3))" name="Needs" strokeWidth={2} />
                    <Line type="monotone" dataKey="wants" stroke="hsl(var(--chart-4))" name="Wants" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Historical Summary</CardTitle>
                  <CardDescription>Last 6 months overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monthlyHistory.map((month) => (
                      <div
                        key={month.month}
                        className="flex justify-between items-center p-3 border border-border rounded-lg"
                      >
                        <span className="font-medium">{month.month}</span>
                        <div className="text-right">
                          <p className="text-sm font-medium">₹{month.expenses.toLocaleString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground">Total expenses</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Monthly Spending</CardTitle>
                  <CardDescription>Based on last 6 months</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span>Average Expenses</span>
                    <span className="text-xl font-bold">
                      ₹
                      {Math.round(
                        monthlyHistory.reduce((sum, m) => sum + m.expenses, 0) / monthlyHistory.length || 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span>Average Needs</span>
                    <span className="text-xl font-bold">
                      ₹
                      {Math.round(
                        monthlyHistory.reduce((sum, m) => sum + m.needs, 0) / monthlyHistory.length || 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span>Average Wants</span>
                    <span className="text-xl font-bold">
                      ₹
                      {Math.round(
                        monthlyHistory.reduce((sum, m) => sum + m.wants, 0) / monthlyHistory.length || 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Expense Categories</CardTitle>
                    <CardDescription>Manage your custom expense categories</CardDescription>
                  </div>
                  <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddCategory}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                        <DialogDescription>
                          {editingCategory ? "Update category details" : "Create a new expense category"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="cat-name">Category Name</Label>
                          <Input
                            id="cat-name"
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            placeholder="e.g., Healthcare, Education"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cat-type">Type</Label>
                          <Select
                            value={categoryForm.type}
                            onValueChange={(value: "need" | "want") =>
                              setCategoryForm({ ...categoryForm, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="need">Need</SelectItem>
                              <SelectItem value="want">Want</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveCategory}>Save</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Tags className="w-4 h-4" />
                      Needs
                    </h3>
                    <div className="space-y-2">
                      {categories
                        .filter((cat) => cat.type === "need")
                        .map((category) => (
                          <div
                            key={category.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg"
                          >
                            <span className="font-medium">{category.name}</span>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Tags className="w-4 h-4" />
                      Wants
                    </h3>
                    <div className="space-y-2">
                      {categories
                        .filter((cat) => cat.type === "want")
                        .map((category) => (
                          <div
                            key={category.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg"
                          >
                            <span className="font-medium">{category.name}</span>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={emergencyFundDialogOpen} onOpenChange={setEmergencyFundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Emergency Fund</DialogTitle>
            <DialogDescription>Update your liquid assets and cash amounts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Liquid Assets</Label>
              <Input
                type="number"
                value={emergencyFundForm.liquid}
                onChange={(e) =>
                  setEmergencyFundForm((prev) => ({
                    ...prev,
                    liquid: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Enter liquid assets amount"
              />
            </div>
            <div>
              <Label>Cash</Label>
              <Input
                type="number"
                value={emergencyFundForm.cash}
                onChange={(e) =>
                  setEmergencyFundForm((prev) => ({
                    ...prev,
                    cash: Number.parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Enter cash amount"
              />
            </div>
            <div className="p-4 border border-border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Emergency Fund</p>
              <p className="text-2xl font-bold flex items-center mt-1">
                <IndianRupee className="w-5 h-5" />
                {(emergencyFundForm.liquid + emergencyFundForm.cash).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmergencyFundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmergencyFund}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
