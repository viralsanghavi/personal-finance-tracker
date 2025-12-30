import { memo, useMemo, useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { api } from "@/lib/api"
import { ThreeCanvas } from "@/components/three-canvas"

interface Expense {
  id: string
  categoryId: string
  category?: Category
  description: string | null
  amount: number
  type: "need" | "want"
  date: string | null
  month?: string
}

interface Investment {
  id: string
  name: string
  purpose?: string | null
  amount: number
  monthlyContribution: number
  collectedAsOf?: number | null
  active?: boolean
  bank?: string | null
  schedule?: string | null
  isSip?: boolean
  month?: string
}

interface Loan {
  id: string
  lender: string
  amount: number
  dueDate: string
  status: "pending" | "paid"
  month?: string
}

interface Category {
  id: string
  name: string
  type: "need" | "want"
}

interface Settings {
  id: string
  monthlyIncome: number
}

interface EmergencyFund {
  id: string
  liquid: number
  cash: number
}

interface AiMessage {
  role: "user" | "assistant"
  content: string
  data?: unknown
}

interface BudgetItem {
  name: string
  value: number
  color: string
}

interface CategoryChartItem {
  name: string
  amount: number
}

const BudgetAllocationChart = memo(function BudgetAllocationChart({ data }: { data: BudgetItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
      </PieChart>
    </ResponsiveContainer>
  )
})

const CategoryBarChart = memo(function CategoryBarChart({ data }: { data: CategoryChartItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
        <Bar dataKey="amount" fill="hsl(var(--chart-2))" />
      </BarChart>
    </ResponsiveContainer>
  )
})

const MonthlyTrendsChart = memo(function MonthlyTrendsChart({
  data,
}: {
  data: { month: string; expenses: number; investments: number; needs: number; wants: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
        <Legend />
        <Line type="monotone" dataKey="expenses" stroke="hsl(var(--chart-2))" name="Total Expenses" strokeWidth={2} />
        <Line type="monotone" dataKey="investments" stroke="hsl(var(--chart-1))" name="Investments" strokeWidth={2} />
        <Line type="monotone" dataKey="needs" stroke="hsl(var(--chart-3))" name="Needs" strokeWidth={2} />
        <Line type="monotone" dataKey="wants" stroke="hsl(var(--chart-4))" name="Wants" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
})

const AiPanel = memo(function AiPanel({
  messages,
  isPending,
  onSend,
}: {
  messages: AiMessage[]
  isPending: boolean
  onSend: (message: string) => void
}) {
  const [input, setInput] = useState("")
  const [showRaw, setShowRaw] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || isPending) return
    onSend(message)
    setInput("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Assistant</CardTitle>
        <CardDescription>Ask for CRUD actions or data insights. Everything runs locally.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[360px] space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-muted/40 p-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-xl p-3 text-sm ${
                message.role === "user"
                  ? "ml-auto w-[85%] bg-primary text-primary-foreground"
                  : "mr-auto w-[85%] bg-background text-foreground"
              }`}
            >
              <p>{message.content}</p>
              {showRaw && message.data ? (
                <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/80 p-2 text-xs text-white">
                  {JSON.stringify(message.data, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Tip: ask in plain English, I’ll run the CRUD for you.</span>
          <Button variant="ghost" size="sm" type="button" onClick={() => setShowRaw((prev) => !prev)}>
            {showRaw ? "Hide Raw Data" : "Show Raw Data"}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Try: Add fuel expense 1000 need today"
            className="flex-1"
          />
          <Button type="submit" disabled={isPending || !input.trim()}>
            {isPending ? "Thinking..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
})

export default function App() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [incomeForm, setIncomeForm] = useState({ amount: 0 })

  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [investmentForm, setInvestmentForm] = useState({
    name: "",
    purpose: "",
    amount: "",
    monthlyContribution: "",
    collectedAsOf: "",
    active: true,
    bank: "",
    schedule: "",
    isSip: false,
  })
  const [investmentFilters, setInvestmentFilters] = useState({
    query: "",
    status: "all" as "all" | "active" | "inactive",
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
    categoryName: "",
    description: "",
    amount: "",
    type: "need" as "need" | "want",
    date: "",
  })
  const [expenseFilters, setExpenseFilters] = useState({
    query: "",
    type: "all" as "all" | "need" | "want",
    min: "",
    max: "",
  })

  const [emergencyFundDialogOpen, setEmergencyFundDialogOpen] = useState(false)
  const [emergencyFundForm, setEmergencyFundForm] = useState({
    liquid: 0,
    cash: 0,
  })

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me to create, update, or delete anything. Examples: 'Add rent 50000 as need', 'Set monthly income to 100000', 'Show top 5 expenses this month'.",
    },
  ])

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings | null>("/api/settings"),
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/api/categories"),
  })

  const expensesQuery = useQuery({
    queryKey: ["expenses", selectedMonth],
    queryFn: () => api<Expense[]>(`/api/expenses?month=${selectedMonth}`),
  })

  const expensesAllQuery = useQuery({
    queryKey: ["expenses", "all"],
    queryFn: () => api<Expense[]>("/api/expenses"),
  })

  const investmentsQuery = useQuery({
    queryKey: ["investments", selectedMonth],
    queryFn: () => api<Investment[]>(`/api/investments?month=${selectedMonth}`),
  })

  const investmentsAllQuery = useQuery({
    queryKey: ["investments", "all"],
    queryFn: () => api<Investment[]>("/api/investments"),
  })

  const loansQuery = useQuery({
    queryKey: ["loans", selectedMonth],
    queryFn: () => api<Loan[]>(`/api/loans?month=${selectedMonth}`),
  })

  const emergencyFundQuery = useQuery({
    queryKey: ["emergency-fund"],
    queryFn: () => api<EmergencyFund | null>("/api/emergency-fund"),
  })

  const createCategory = useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      api<Category>("/api/categories", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  })

  const createExpense = useMutation({
    mutationFn: (data: {
      categoryId: string
      description?: string
      amount: number
      type: string
      date?: string
      month: string
    }) => api<Expense>("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", selectedMonth] })
      queryClient.invalidateQueries({ queryKey: ["expenses", "all"] })
    },
  })

  const updateExpense = useMutation({
    mutationFn: (data: {
      id: string
      categoryId: string
      description?: string
      amount: number
      type: string
      date?: string
      month?: string
    }) => api<Expense>(`/api/expenses/${data.id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", selectedMonth] })
      queryClient.invalidateQueries({ queryKey: ["expenses", "all"] })
    },
  })

  const deleteExpense = useMutation({
    mutationFn: (id: string) => api<void>(`/api/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", selectedMonth] })
      queryClient.invalidateQueries({ queryKey: ["expenses", "all"] })
    },
  })

  const createInvestment = useMutation({
    mutationFn: (data: {
      name: string
      purpose?: string
      amount: number
      monthlyContribution: number
      collectedAsOf?: number
      active?: boolean
      bank?: string
      schedule?: string
      isSip?: boolean
      month: string
    }) =>
      api<Investment>("/api/investments", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investments", selectedMonth] }),
  })

  const updateInvestment = useMutation({
    mutationFn: (data: {
      id: string
      name: string
      purpose?: string
      amount: number
      monthlyContribution: number
      collectedAsOf?: number
      active?: boolean
      bank?: string
      schedule?: string
      isSip?: boolean
      month?: string
    }) =>
      api<Investment>(`/api/investments/${data.id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investments", selectedMonth] }),
  })

  const deleteInvestment = useMutation({
    mutationFn: (id: string) => api<void>(`/api/investments/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investments", selectedMonth] }),
  })

  const createLoan = useMutation({
    mutationFn: (data: { lender: string; amount: number; dueDate: string; status: string; month: string }) =>
      api<Loan>("/api/loans", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loans", selectedMonth] }),
  })

  const updateLoan = useMutation({
    mutationFn: (data: { id: string; lender: string; amount: number; dueDate: string; status: string; month?: string }) =>
      api<Loan>(`/api/loans/${data.id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loans", selectedMonth] }),
  })

  const deleteLoan = useMutation({
    mutationFn: (id: string) => api<void>(`/api/loans/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loans", selectedMonth] }),
  })

  const updateEmergencyFund = useMutation({
    mutationFn: (data: { liquid: number; cash: number }) =>
      api<EmergencyFund>("/api/emergency-fund", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergency-fund"] }),
  })

  const updateSettings = useMutation({
    mutationFn: (data: { monthlyIncome: number }) =>
      api<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  })

  const aiMutation = useMutation({
    mutationFn: (message: string) =>
      api<{ reply: string; data?: unknown }>("/api/ai", {
        method: "POST",
        body: JSON.stringify({ message, month: selectedMonth }),
      }),
    onSuccess: (response) => {
      setAiMessages((prev) => [...prev, { role: "assistant", content: response.reply, data: response.data }])
      queryClient.invalidateQueries({ queryKey: ["expenses", selectedMonth] })
      queryClient.invalidateQueries({ queryKey: ["expenses", "all"] })
      queryClient.invalidateQueries({ queryKey: ["investments", selectedMonth] })
      queryClient.invalidateQueries({ queryKey: ["investments", "all"] })
      queryClient.invalidateQueries({ queryKey: ["loans", selectedMonth] })
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      queryClient.invalidateQueries({ queryKey: ["emergency-fund"] })
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: () => {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I hit an issue handling that. Try rephrasing or be more specific." },
      ])
    },
  })

  const categories = (categoriesQuery.data ?? []).map((category) => ({
    ...category,
    type: category.type.toLowerCase() as Category["type"],
  }))

  const expenses = (expensesQuery.data ?? []).map((expense) => ({
    ...expense,
    type: expense.type.toLowerCase() as Expense["type"],
    date: expense.date ?? null,
  }))

  const expensesAll = (expensesAllQuery.data ?? []).map((expense) => ({
    ...expense,
    type: expense.type.toLowerCase() as Expense["type"],
    date: expense.date ?? null,
  }))

  const investments = investmentsQuery.data ?? []
  const investmentsAll = investmentsAllQuery.data ?? []
  const sipInvestments = useMemo(() => {
    return investments.filter((investment) => {
      if (investment.isSip) return true
      const purpose = investment.purpose?.toLowerCase() ?? ""
      if (purpose.includes("sip")) return true
      const schedule = investment.schedule?.toLowerCase() ?? ""
      return schedule.includes("month") || schedule.includes("weekly")
    })
  }, [investments])

  const loans = (loansQuery.data ?? []).map((loan) => ({
    ...loan,
    status: loan.status.toLowerCase() as Loan["status"],
  }))

  const emergencyFund = emergencyFundQuery.data ?? { liquid: 0, cash: 0 }
  const monthlyIncome = settingsQuery.data?.monthlyIncome ?? 0

  const emergencyTotals = useMemo(() => {
    const total = emergencyFund.liquid + emergencyFund.cash
    return {
      total,
      target6X: monthlyIncome * 6,
      target12X: monthlyIncome * 12,
    }
  }, [emergencyFund.cash, emergencyFund.liquid, monthlyIncome])

  const handleEditEmergencyFund = () => {
    setEmergencyFundForm({
      liquid: emergencyFund.liquid ?? 0,
      cash: emergencyFund.cash ?? 0,
    })
    setEmergencyFundDialogOpen(true)
  }

  const handleSaveEmergencyFund = () => {
    updateEmergencyFund.mutate({
      liquid: emergencyFundForm.liquid,
      cash: emergencyFundForm.cash,
    })
    setEmergencyFundDialogOpen(false)
  }

  const handleSaveIncome = () => {
    updateSettings.mutate({ monthlyIncome: incomeForm.amount })
    setSettingsDialogOpen(false)
  }

  const openSettingsDialog = () => {
    setIncomeForm({ amount: monthlyIncome })
    setSettingsDialogOpen(true)
  }

  const filteredExpenses = expenses
  const totalInvestments = investments.reduce((sum, inv) => sum + inv.monthlyContribution, 0)
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const totalNeeds = filteredExpenses.filter((e) => e.type === "need").reduce((sum, exp) => sum + exp.amount, 0)
  const totalWants = filteredExpenses.filter((e) => e.type === "want").reduce((sum, exp) => sum + exp.amount, 0)
  const remaining = monthlyIncome - totalExpenses - totalInvestments

  const expensesFiltered = useMemo(() => {
    const query = expenseFilters.query.trim().toLowerCase()
    const min = expenseFilters.min ? Number.parseFloat(expenseFilters.min) : null
    const max = expenseFilters.max ? Number.parseFloat(expenseFilters.max) : null

    return filteredExpenses.filter((expense) => {
      if (expenseFilters.type !== "all" && expense.type !== expenseFilters.type) return false
      if (min !== null && expense.amount < min) return false
      if (max !== null && expense.amount > max) return false
      if (!query) return true
      const haystack = `${expense.category?.name ?? ""} ${expense.description ?? ""}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [expenseFilters, filteredExpenses])

  const investmentsFiltered = useMemo(() => {
    const query = investmentFilters.query.trim().toLowerCase()
    const status = investmentFilters.status

    return investments.filter((investment) => {
      if (status === "active" && investment.active === false) return false
      if (status === "inactive" && investment.active !== false) return false
      if (!query) return true
      const haystack = `${investment.name} ${investment.purpose ?? ""} ${investment.bank ?? ""}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [investmentFilters, investments])

  const monthlyHistory = useMemo(() => {
    const monthsMap = new Map<string, { expenses: number; investments: number; needs: number; wants: number }>()

    expensesAll.forEach((exp) => {
      if (!exp.date) return
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
  }, [expensesAll, totalInvestments])

  const insights = useMemo(() => {
    const monthKey = selectedMonth
    const prevDate = new Date(`${monthKey}-01T00:00:00.000Z`)
    prevDate.setUTCMonth(prevDate.getUTCMonth() - 1)
    const prevKey = prevDate.toISOString().slice(0, 7)

    const expenseMap = new Map<string, { total: number; needs: number; wants: number }>()
    expensesAll.forEach((exp) => {
      const month = exp.month ?? (exp.date ? exp.date.slice(0, 7) : null)
      if (!month) return
      if (!expenseMap.has(month)) {
        expenseMap.set(month, { total: 0, needs: 0, wants: 0 })
      }
      const data = expenseMap.get(month)!
      data.total += exp.amount
      if (exp.type === "need") data.needs += exp.amount
      else data.wants += exp.amount
    })

    const investmentMap = new Map<string, number>()
    investmentsAll.forEach((inv) => {
      if (!inv.month) return
      investmentMap.set(inv.month, (investmentMap.get(inv.month) || 0) + inv.monthlyContribution)
    })

    const currentExpenses = expenseMap.get(monthKey)?.total ?? 0
    const prevExpenses = expenseMap.get(prevKey)?.total ?? 0
    const currentInvestments = investmentMap.get(monthKey) ?? 0
    const prevInvestments = investmentMap.get(prevKey) ?? 0

    const insightsList: string[] = []

    if (prevExpenses > 0) {
      const diff = ((currentExpenses - prevExpenses) / prevExpenses) * 100
      insightsList.push(
        `Expenses ${diff >= 0 ? "up" : "down"} ${Math.abs(diff).toFixed(1)}% vs last month`,
      )
    } else if (currentExpenses > 0) {
      insightsList.push("Expenses started this month")
    }

    if (prevInvestments > 0) {
      const diff = ((currentInvestments - prevInvestments) / prevInvestments) * 100
      insightsList.push(
        `Investments ${diff >= 0 ? "up" : "down"} ${Math.abs(diff).toFixed(1)}% vs last month`,
      )
    } else if (currentInvestments > 0) {
      insightsList.push("Investments started this month")
    }

    const topCategory = [...filteredExpenses]
      .reduce((acc, exp) => {
        const key = exp.category?.name ?? "Uncategorized"
        acc[key] = (acc[key] || 0) + exp.amount
        return acc
      }, {} as Record<string, number>)
    const topEntry = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0]
    if (topEntry) {
      insightsList.push(`Top spend: ${topEntry[0]} (₹${topEntry[1].toLocaleString("en-IN")})`)
    }

    return insightsList
  }, [expensesAll, filteredExpenses, investmentsAll, selectedMonth])

  const budgetData = useMemo(
    () => [
      { name: "Investments", value: totalInvestments, color: "hsl(var(--chart-1))" },
      { name: "Needs", value: totalNeeds, color: "hsl(var(--chart-2))" },
      { name: "Wants", value: totalWants, color: "hsl(var(--chart-3))" },
      { name: "Remaining", value: remaining, color: "hsl(var(--chart-4))" },
    ],
    [remaining, totalInvestments, totalNeeds, totalWants],
  )

  const categoryChartData = useMemo(() => {
    const expensesByCategory = filteredExpenses.reduce(
      (acc, exp) => {
        const categoryName = exp.category?.name ?? "Uncategorized"
        acc[categoryName] = (acc[categoryName] || 0) + exp.amount
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(expensesByCategory).map(([name, amount]) => ({
      name,
      amount,
    }))
  }, [filteredExpenses])

  const expensePreview = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5)
  }, [filteredExpenses])

  const investmentPreview = useMemo(() => {
    return [...investments].sort((a, b) => b.amount - a.amount).slice(0, 5)
  }, [investments])

  const loanPreview = useMemo(() => {
    return [...loans].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5)
  }, [loans])

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
      categoryName: "",
      description: "",
      amount: "",
      type: "need",
      date: "",
    })
    setExpenseDialogOpen(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseForm({
      categoryName: expense.category?.name ?? "",
      description: expense.description ?? "",
      amount: expense.amount.toString(),
      type: expense.type,
      date: expense.date ? expense.date.slice(0, 10) : "",
    })
    setExpenseDialogOpen(true)
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.categoryName || !expenseForm.amount) return

    const normalizedName = expenseForm.categoryName.trim()
    const existingCategory = categories.find(
      (category) => category.name.toLowerCase() === normalizedName.toLowerCase(),
    )
    const category =
      existingCategory ??
      (await createCategory.mutateAsync({
        name: normalizedName,
        type: expenseForm.type,
      }))

    const payload = {
      categoryId: category.id,
      description: expenseForm.description,
      amount: Number.parseFloat(expenseForm.amount),
      type: expenseForm.type,
      date: expenseForm.date || undefined,
    }

    if (editingExpense) {
      updateExpense.mutate({ ...payload, id: editingExpense.id, month: selectedMonth })
    } else {
      createExpense.mutate({ ...payload, month: selectedMonth })
    }
    setExpenseDialogOpen(false)
  }

  const handleDeleteExpense = (id: string) => {
    deleteExpense.mutate(id)
  }

  const handleAddInvestment = () => {
    setEditingInvestment(null)
    setInvestmentForm({
      name: "",
      purpose: "",
      amount: "",
      monthlyContribution: "",
      collectedAsOf: "",
      active: true,
      bank: "",
      schedule: "",
      isSip: false,
    })
    setInvestmentDialogOpen(true)
  }

  const handleEditInvestment = (investment: Investment) => {
    setEditingInvestment(investment)
    setInvestmentForm({
      name: investment.name,
      purpose: investment.purpose ?? "",
      amount: investment.amount.toString(),
      monthlyContribution: investment.monthlyContribution.toString(),
      collectedAsOf: investment.collectedAsOf?.toString() ?? "",
      active: investment.active ?? true,
      bank: investment.bank ?? "",
      schedule: investment.schedule ?? "",
      isSip: investment.isSip ?? false,
    })
    setInvestmentDialogOpen(true)
  }

  const handleSaveInvestment = () => {
    if (!investmentForm.name || !investmentForm.amount || !investmentForm.monthlyContribution) return

    if (editingInvestment) {
      updateInvestment.mutate({
        id: editingInvestment.id,
        name: investmentForm.name,
        purpose: investmentForm.purpose || undefined,
        amount: Number.parseFloat(investmentForm.amount),
        monthlyContribution: Number.parseFloat(investmentForm.monthlyContribution),
        collectedAsOf: investmentForm.collectedAsOf ? Number.parseFloat(investmentForm.collectedAsOf) : undefined,
        active: investmentForm.active,
        bank: investmentForm.bank || undefined,
        schedule: investmentForm.schedule || undefined,
        isSip: investmentForm.isSip,
        month: selectedMonth,
      })
    } else {
      createInvestment.mutate({
        name: investmentForm.name,
        purpose: investmentForm.purpose || undefined,
        amount: Number.parseFloat(investmentForm.amount),
        monthlyContribution: Number.parseFloat(investmentForm.monthlyContribution),
        collectedAsOf: investmentForm.collectedAsOf ? Number.parseFloat(investmentForm.collectedAsOf) : undefined,
        active: investmentForm.active,
        bank: investmentForm.bank || undefined,
        schedule: investmentForm.schedule || undefined,
        isSip: investmentForm.isSip,
        month: selectedMonth,
      })
    }
    setInvestmentDialogOpen(false)
  }

  const handleDeleteInvestment = (id: string) => {
    deleteInvestment.mutate(id)
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
      updateLoan.mutate({
        id: editingLoan.id,
        lender: loanForm.lender,
        amount: Number.parseFloat(loanForm.amount),
        dueDate: loanForm.dueDate,
        status: loanForm.status,
        month: selectedMonth,
      })
    } else {
      createLoan.mutate({
        lender: loanForm.lender,
        amount: Number.parseFloat(loanForm.amount),
        dueDate: loanForm.dueDate,
        status: loanForm.status,
        month: selectedMonth,
      })
    }
    setLoanDialogOpen(false)
  }

  const handleDeleteLoan = (id: string) => {
    deleteLoan.mutate(id)
  }

  const handleSendAi = (message: string) => {
    setAiMessages((prev) => [...prev, { role: "user", content: message }])
    aiMutation.mutate(message)
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
      Category: exp.category?.name ?? "",
      Description: exp.description ?? "",
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
      { Category: "Emergency Fund Total", Amount: emergencyTotals.total },
      { Category: "Emergency Fund 6X Target", Amount: emergencyTotals.target6X },
      { Category: "Emergency Fund 12X Target", Amount: emergencyTotals.target12X },
    ]
    exportToCSV(reportData, `monthly-report-${selectedMonth}.csv`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(1200px_circle_at_top,_rgba(13,148,136,0.18),_transparent_65%)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(800px_circle_at_15%_20%,_rgba(59,130,246,0.12),_transparent_55%)]" />
      <header className="relative sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <ThreeCanvas className="h-full w-full opacity-20" tint="#34d399" intensity={0.7} speed={0.18} />
        </div>
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 animate-float-soft">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Atlas Finance</p>
                <h1 className="text-xl md:text-2xl font-semibold text-foreground">Finance Tracker</h1>
                <p className="text-xs md:text-sm text-muted-foreground">A calm command center for your money</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap md:flex-nowrap">
              <Button variant="outline" size="sm" onClick={openSettingsDialog} className="w-full sm:w-auto">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
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
              <div className="rounded-xl border border-border/60 bg-muted/50 px-4 py-2 text-left sm:text-right">
                <p className="text-xs text-muted-foreground">Monthly Income</p>
                <p className="text-2xl md:text-3xl font-semibold text-foreground flex items-center gap-1">
                  <IndianRupee className="w-5 h-5 md:w-6 md:h-6" />
                  {monthlyIncome.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-16 pt-8">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth} className="w-full sm:w-auto">
              <ChevronLeft className="h-4 w-4" />
              <span className="sm:hidden">Previous</span>
            </Button>
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/60 px-4 py-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-base sm:text-lg font-semibold text-foreground">{selectedMonthName}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="w-full sm:w-auto">
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleCurrentMonth} className="w-full sm:w-auto">
            Current Month
          </Button>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 bg-background/70 shadow-sm transition-transform duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
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

          <Card className="relative overflow-hidden border-border/60 bg-background/70 shadow-sm transition-transform duration-300 hover:-translate-y-1">
            <ThreeCanvas className="pointer-events-none absolute inset-0 opacity-15" tint="#22c55e" intensity={0.6} />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Investments</CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="relative pt-4">
              <div className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {totalInvestments.toLocaleString("en-IN")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{investments.length} active investments</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 shadow-sm transition-transform duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
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

          <Card className="border-border/60 bg-background/70 shadow-sm transition-transform duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Emergency Fund</CardTitle>
              <PiggyBank className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {emergencyTotals.total.toLocaleString("en-IN")}
              </div>
              <div className="mt-2">
                <Progress
                  value={emergencyTotals.target6X > 0 ? (emergencyTotals.total / emergencyTotals.target6X) * 100 : 0}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {emergencyTotals.target6X > 0
                    ? ((emergencyTotals.total / emergencyTotals.target6X) * 100).toFixed(1)
                    : 0}
                  % of 6X target
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleEditEmergencyFund} className="mt-2 w-full text-primary">
                <Pencil className="h-3 w-3 mr-1" />
                Update Fund
              </Button>
            </CardContent>
          </Card>
        </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 animate-fade-rise">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm backdrop-blur">
              <TabsList className="flex w-full flex-wrap gap-2 bg-transparent p-0">
              <TabsTrigger
                value="overview"
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Expenses
              </TabsTrigger>
              <TabsTrigger
                value="investments"
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Investments
              </TabsTrigger>
              <TabsTrigger
                value="sips"
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                SIPs
              </TabsTrigger>
              <TabsTrigger
                value="emergency"
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Emergency Fund
              </TabsTrigger>
              <TabsTrigger
                value="loans"
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Loans
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                History
              </TabsTrigger>
              <TabsTrigger
                value="ai"
                className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium data-[state=active]:border-primary/30 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                AI
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-w-0 space-y-6">
            {activeTab !== "overview" ? (
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 shadow-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">All Views</p>
                  <p className="text-sm font-medium text-foreground">Overview</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("overview")}>
                  Back to Overview
                </Button>
              </div>
            ) : null}
            <TabsContent value="overview" className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Expenses Snapshot</CardTitle>
                  <CardDescription>Recent expenses for the month</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {expensePreview.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-3"
                    >
                      <div>
                        <p className="font-medium">{expense.category?.name ?? "Uncategorized"}</p>
                        <p className="text-xs text-muted-foreground">
                          {expense.date ?? "No date"} • {expense.type}
                        </p>
                      </div>
                      <p className="font-semibold flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {expense.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                  {expensePreview.length === 0 && (
                    <p className="text-center text-muted-foreground py-6">No recent expenses</p>
                  )}
                </CardContent>
                <div className="px-6 pb-6">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("expenses")}>
                    View all expenses
                  </Button>
                </div>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Investments Snapshot</CardTitle>
                  <CardDescription>Top monthly contributions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {investmentPreview.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-3"
                    >
                      <div>
                        <p className="font-medium">{investment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {investment.purpose ?? "Investment"}
                        </p>
                      </div>
                      <p className="font-semibold flex items-center">
                        <IndianRupee className="w-4 h-4" />
                        {investment.monthlyContribution.toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                  {investmentPreview.length === 0 && (
                    <p className="text-center text-muted-foreground py-6">No investments yet</p>
                  )}
                </CardContent>
                <div className="px-6 pb-6 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("investments")}>
                    View investments
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("sips")}>
                    View SIPs
                  </Button>
                </div>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
                <CardDescription>Month-over-month signals and highlights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {insights.map((insight, index) => (
                    <div
                      key={`${insight}-${index}`}
                      className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm text-foreground"
                    >
                      {insight}
                    </div>
                  ))}
                  {insights.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No insights yet.</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Budget Allocation</CardTitle>
                  <CardDescription>Monthly income distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <BudgetAllocationChart data={budgetData} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                  <CardDescription>Breakdown of spending</CardDescription>
                </CardHeader>
                <CardContent>
                  <CategoryBarChart data={categoryChartData} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="space-y-1 pb-4">
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

          <TabsContent value="expenses" className="space-y-8">
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
                      <DialogHeader className="space-y-2">
                        <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
                        <DialogDescription>
                          {editingExpense ? "Update expense details" : "Enter details for your new expense"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="expense-type" className="text-sm font-medium">
                            Type of Expense
                          </Label>
                          <Input
                            id="expense-type"
                            value={expenseForm.categoryName}
                            onChange={(e) => setExpenseForm({ ...expenseForm, categoryName: e.target.value })}
                            placeholder="e.g., Rent, Wifi, Outside Food"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description" className="text-sm font-medium">
                            Description
                          </Label>
                          <Input
                            id="description"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            placeholder="Optional description"
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount" className="text-sm font-medium">
                            Amount
                          </Label>
                          <Input
                            id="amount"
                            type="number"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="type" className="text-sm font-medium">
                            Type
                          </Label>
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
                          <Label htmlFor="date" className="text-sm font-medium">
                            Date
                          </Label>
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
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">Search</Label>
                    <Input
                      value={expenseFilters.query}
                      onChange={(e) => setExpenseFilters({ ...expenseFilters, query: e.target.value })}
                      placeholder="Search by type or description"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <Select
                      value={expenseFilters.type}
                      onValueChange={(value: "all" | "need" | "want") =>
                        setExpenseFilters({ ...expenseFilters, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="need">Need</SelectItem>
                        <SelectItem value="want">Want</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm font-medium">Min</Label>
                      <Input
                        type="number"
                        value={expenseFilters.min}
                        onChange={(e) => setExpenseFilters({ ...expenseFilters, min: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Max</Label>
                      <Input
                        type="number"
                        value={expenseFilters.max}
                        onChange={(e) => setExpenseFilters({ ...expenseFilters, max: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing {expensesFiltered.length} of {filteredExpenses.length} expenses
                </div>
                <div className="space-y-3">
                  {expensesFiltered.map((expense) => (
                    <div
                      key={expense.id}
                      className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{expense.category?.name ?? "Uncategorized"}</p>
                          <Badge variant={expense.type === "need" ? "default" : "secondary"}>{expense.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{expense.description ?? "No description"}</p>
                        <p className="text-xs text-muted-foreground mt-1">{expense.date ?? "No date"}</p>
                      </div>
                      <div className="flex items-center gap-3">
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
                  {expensesFiltered.length === 0 && (
                    <p className="text-center text-muted-foreground py-10">No expenses for this month</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investments" className="space-y-8">
            <Card>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Investment Portfolio</CardTitle>
                    <CardDescription>
                      Your investment accounts and contributions • {(monthlyIncome > 0
                        ? ((totalInvestments / monthlyIncome) * 100).toFixed(1)
                        : 0)}
                      % of income
                    </CardDescription>
                  </div>
                  <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddInvestment}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Investment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader className="space-y-2">
                        <DialogTitle>{editingInvestment ? "Edit Investment" : "Add New Investment"}</DialogTitle>
                        <DialogDescription>
                          {editingInvestment ? "Update investment details" : "Enter details for your new investment"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="inv-purpose" className="text-sm font-medium">
                            Purpose
                          </Label>
                          <Input
                            id="inv-purpose"
                            value={investmentForm.purpose}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, purpose: e.target.value })}
                            placeholder="e.g., Investment, Tax Saver"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inv-name" className="text-sm font-medium">
                            Investment Name
                          </Label>
                          <Input
                            id="inv-name"
                            value={investmentForm.name}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })}
                            placeholder="e.g., LIC, SIP, Insurance"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inv-amount" className="text-sm font-medium">
                            Total Amount
                          </Label>
                          <Input
                            id="inv-amount"
                            type="number"
                            value={investmentForm.amount}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inv-monthly" className="text-sm font-medium">
                            Monthly Contribution
                          </Label>
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
                        <div>
                          <Label htmlFor="inv-collected" className="text-sm font-medium">
                            Collected As Of
                          </Label>
                          <Input
                            id="inv-collected"
                            type="number"
                            value={investmentForm.collectedAsOf}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, collectedAsOf: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inv-bank" className="text-sm font-medium">
                            Bank
                          </Label>
                          <Input
                            id="inv-bank"
                            value={investmentForm.bank}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, bank: e.target.value })}
                            placeholder="e.g., HDFC, Axis"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inv-schedule" className="text-sm font-medium">
                            Schedule
                          </Label>
                          <Input
                            id="inv-schedule"
                            value={investmentForm.schedule}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, schedule: e.target.value })}
                            placeholder="e.g., 1st of month, Weekly"
                          />
                        </div>
                        <div>
                          <Label htmlFor="inv-active" className="text-sm font-medium">
                            Active
                          </Label>
                          <Select
                            value={investmentForm.active ? "true" : "false"}
                            onValueChange={(value) =>
                              setInvestmentForm({ ...investmentForm, active: value === "true" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Active</SelectItem>
                              <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="inv-sip" className="text-sm font-medium">
                            SIP
                          </Label>
                          <Select
                            value={investmentForm.isSip ? "true" : "false"}
                            onValueChange={(value) =>
                              setInvestmentForm({ ...investmentForm, isSip: value === "true" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
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
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">Search</Label>
                    <Input
                      value={investmentFilters.query}
                      onChange={(e) => setInvestmentFilters({ ...investmentFilters, query: e.target.value })}
                      placeholder="Search by name, purpose, bank"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={investmentFilters.status}
                      onValueChange={(value: "all" | "active" | "inactive") =>
                        setInvestmentFilters({ ...investmentFilters, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing {investmentsFiltered.length} of {investments.length} investments
                </div>
                <div className="space-y-3">
                  {investmentsFiltered.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{investment.name}</p>
                        <div className="text-sm text-muted-foreground">
                          {investment.purpose ? `${investment.purpose} • ` : ""}Monthly: ₹
                          {investment.monthlyContribution.toLocaleString("en-IN")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {investment.collectedAsOf !== null && investment.collectedAsOf !== undefined
                            ? `Collected: ₹${investment.collectedAsOf.toLocaleString("en-IN")}`
                            : "Collected: -"}
                          {investment.bank ? ` • ${investment.bank}` : ""}
                          {investment.schedule ? ` • ${investment.schedule}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {investment.active === false ? <Badge variant="secondary">Inactive</Badge> : null}
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
                  <div className="pt-4 border-t border-border/60">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Total Portfolio Value</p>
                      <p className="text-2xl font-bold flex items-center text-primary">
                        <IndianRupee className="w-5 h-5" />
                        {investmentsFiltered.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sips" className="space-y-8">
            <Card>
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>SIP Plans</CardTitle>
                    <CardDescription>Monthly investments and recurring contributions</CardDescription>
                  </div>
                  <Dialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleAddInvestment}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add SIP
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader className="space-y-2">
                        <DialogTitle>{editingInvestment ? "Edit SIP" : "Add New SIP"}</DialogTitle>
                        <DialogDescription>
                          {editingInvestment ? "Update SIP details" : "Enter details for your new SIP"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="sip-purpose" className="text-sm font-medium">
                            Purpose
                          </Label>
                          <Input
                            id="sip-purpose"
                            value={investmentForm.purpose}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, purpose: e.target.value })}
                            placeholder="e.g., Investment, Tax Saver"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sip-name" className="text-sm font-medium">
                            SIP Name
                          </Label>
                          <Input
                            id="sip-name"
                            value={investmentForm.name}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, name: e.target.value })}
                            placeholder="e.g., Index Fund, Bluechip"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sip-amount" className="text-sm font-medium">
                            Total Amount
                          </Label>
                          <Input
                            id="sip-amount"
                            type="number"
                            value={investmentForm.amount}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sip-monthly" className="text-sm font-medium">
                            Monthly Contribution
                          </Label>
                          <Input
                            id="sip-monthly"
                            type="number"
                            value={investmentForm.monthlyContribution}
                            onChange={(e) =>
                              setInvestmentForm({ ...investmentForm, monthlyContribution: e.target.value })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sip-collected" className="text-sm font-medium">
                            Collected As Of
                          </Label>
                          <Input
                            id="sip-collected"
                            type="number"
                            value={investmentForm.collectedAsOf}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, collectedAsOf: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sip-bank" className="text-sm font-medium">
                            Bank
                          </Label>
                          <Input
                            id="sip-bank"
                            value={investmentForm.bank}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, bank: e.target.value })}
                            placeholder="e.g., HDFC, Axis"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sip-schedule" className="text-sm font-medium">
                            Schedule
                          </Label>
                          <Input
                            id="sip-schedule"
                            value={investmentForm.schedule}
                            onChange={(e) => setInvestmentForm({ ...investmentForm, schedule: e.target.value })}
                            placeholder="e.g., 1st of month, Weekly"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sip-active" className="text-sm font-medium">
                            Active
                          </Label>
                          <Select
                            value={investmentForm.active ? "true" : "false"}
                            onValueChange={(value) =>
                              setInvestmentForm({ ...investmentForm, active: value === "true" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Active</SelectItem>
                              <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="sip-flag" className="text-sm font-medium">
                            SIP
                          </Label>
                          <Select
                            value={investmentForm.isSip ? "true" : "false"}
                            onValueChange={(value) =>
                              setInvestmentForm({ ...investmentForm, isSip: value === "true" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
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
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {sipInvestments.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{investment.name}</p>
                        <div className="text-sm text-muted-foreground">
                          {investment.purpose ? `${investment.purpose} • ` : ""}Monthly: ₹
                          {investment.monthlyContribution.toLocaleString("en-IN")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {investment.collectedAsOf !== null && investment.collectedAsOf !== undefined
                            ? `Collected: ₹${investment.collectedAsOf.toLocaleString("en-IN")}`
                            : "Collected: -"}
                          {investment.bank ? ` • ${investment.bank}` : ""}
                          {investment.schedule ? ` • ${investment.schedule}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {investment.active === false ? <Badge variant="secondary">Inactive</Badge> : null}
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
                  {sipInvestments.length === 0 && (
                    <p className="text-center text-muted-foreground py-10">No SIPs yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="emergency" className="space-y-8">
            <Card>
              <CardHeader className="space-y-1 pb-4">
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
                  <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                    <p className="text-sm text-muted-foreground">Liquid Assets</p>
                    <p className="text-2xl font-bold flex items-center mt-1">
                      <IndianRupee className="w-5 h-5" />
                      {emergencyFund.liquid.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-4">
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
                      ₹{emergencyTotals.total.toLocaleString("en-IN")} / ₹
                      {emergencyTotals.target6X.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Progress
                    value={
                      emergencyTotals.target6X > 0 ? (emergencyTotals.total / emergencyTotals.target6X) * 100 : 0
                    }
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {emergencyTotals.target6X > 0
                      ? ((emergencyTotals.total / emergencyTotals.target6X) * 100).toFixed(1)
                      : 0}
                    % complete
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">12X Target Progress</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{emergencyTotals.total.toLocaleString("en-IN")} / ₹
                      {emergencyTotals.target12X.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Progress
                    value={
                      emergencyTotals.target12X > 0 ? (emergencyTotals.total / emergencyTotals.target12X) * 100 : 0
                    }
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {emergencyTotals.target12X > 0
                      ? ((emergencyTotals.total / emergencyTotals.target12X) * 100).toFixed(1)
                      : 0}
                    % complete
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans" className="space-y-8">
            <Card>
              <CardHeader className="space-y-1 pb-4">
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
                      <DialogHeader className="space-y-2">
                        <DialogTitle>{editingLoan ? "Edit Loan" : "Add New Loan"}</DialogTitle>
                        <DialogDescription>
                          {editingLoan ? "Update loan details" : "Enter details for your new loan"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5">
                        <div>
                          <Label htmlFor="lender" className="text-sm font-medium">
                            Lender
                          </Label>
                          <Input
                            id="lender"
                            value={loanForm.lender}
                            onChange={(e) => setLoanForm({ ...loanForm, lender: e.target.value })}
                            placeholder="e.g., Mom, Jay, Bank"
                          />
                        </div>
                        <div>
                          <Label htmlFor="loan-amount" className="text-sm font-medium">
                            Amount
                          </Label>
                          <Input
                            id="loan-amount"
                            type="number"
                            value={loanForm.amount}
                            onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="due-date" className="text-sm font-medium">
                            Due Date
                          </Label>
                          <Input
                            id="due-date"
                            type="date"
                            value={loanForm.dueDate}
                            onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="status" className="text-sm font-medium">
                            Status
                          </Label>
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
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {loans.map((loan) => (
                    <div
                      key={loan.id}
                      className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{loan.lender}</p>
                        <p className="text-sm text-muted-foreground">Due: {loan.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-3">
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

          <TabsContent value="history" className="space-y-8">
            <Card>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Track your spending and investment patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyTrendsChart data={monthlyHistory} />
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle>Historical Summary</CardTitle>
                <CardDescription>Last 6 months overview</CardDescription>
              </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monthlyHistory.map((month) => (
                      <div
                        key={month.month}
                        className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-3"
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
              <CardHeader className="space-y-1 pb-4">
                <CardTitle>Average Monthly Spending</CardTitle>
                <CardDescription>Based on last 6 months</CardDescription>
              </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-4">
                    <span>Average Expenses</span>
                    <span className="text-xl font-bold">
                      ₹
                      {Math.round(
                        monthlyHistory.reduce((sum, m) => sum + m.expenses, 0) / monthlyHistory.length || 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-4">
                    <span>Average Needs</span>
                    <span className="text-xl font-bold">
                      ₹
                      {Math.round(
                        monthlyHistory.reduce((sum, m) => sum + m.needs, 0) / monthlyHistory.length || 0,
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 p-4">
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

          <TabsContent value="ai" className="space-y-6">
            <AiPanel messages={aiMessages} isPending={aiMutation.isPending} onSend={handleSendAi} />
          </TabsContent>

          </div>
        </Tabs>
      </main>

      <Dialog open={emergencyFundDialogOpen} onOpenChange={setEmergencyFundDialogOpen}>
        <DialogContent>
          <DialogHeader className="space-y-2">
            <DialogTitle>Update Emergency Fund</DialogTitle>
            <DialogDescription>Update your liquid assets and cash amounts</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium">Liquid Assets</Label>
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
              <Label className="text-sm font-medium">Cash</Label>
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
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
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

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader className="space-y-2">
            <DialogTitle>Monthly Income</DialogTitle>
            <DialogDescription>Set your baseline income for budgeting and targets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label htmlFor="monthly-income" className="text-sm font-medium">
                Income Amount
              </Label>
              <Input
                id="monthly-income"
                type="number"
                value={incomeForm.amount}
                onChange={(e) =>
                  setIncomeForm({
                    amount: Number.parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveIncome}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
