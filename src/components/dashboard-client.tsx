"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, PlusCircle, Trash2, Wallet } from "lucide-react";

import type { CategoryDTO, DashboardResponse, TransactionDTO } from "@/types/finance";
import { http } from "@/lib/http";
import { formatCurrency, toDateInputValue } from "@/lib/format";
import { categorySchema, transactionSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type CategoryFormInput = z.infer<typeof categorySchema>;
type TransactionFormInput = z.infer<typeof transactionSchema>;

type Props = {
  initialData: DashboardResponse;
};

const CHART_COLORS = ["#a78bfa", "#34d399", "#fb923c", "#60a5fa", "#f472b6", "#fbbf24"];

function calculateSummary(transactions: TransactionDTO[]) {
  return transactions.reduce(
    (acc, item) => {
      if (item.type === "income") {
        acc.totalIncome += item.amount;
      } else {
        acc.totalExpense += item.amount;
      }
      acc.balance = acc.totalIncome - acc.totalExpense;
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, balance: 0 },
  );
}

export function DashboardClient({ initialData }: Props) {
  const [month, setMonth] = useState(initialData.month);
  const [transactions, setTransactions] = useState<TransactionDTO[]>(initialData.transactions);
  const [categories, setCategories] = useState<CategoryDTO[]>(initialData.categories);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);

  const expenseByCategoryData = useMemo(() => {
    const map = new Map<string, number>();

    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        map.set(item.categoryName, (map.get(item.categoryName) ?? 0) + item.amount);
      });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const incomeVsExpenseData = useMemo(
    () => [
      { name: "Entradas", value: summary.totalIncome },
      { name: "Saidas", value: summary.totalExpense },
    ],
    [summary.totalExpense, summary.totalIncome],
  );

  const categoryForm = useForm<CategoryFormInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

  const transactionForm = useForm<TransactionFormInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      title: "",
      amount: 0,
      type: "expense",
      categoryId: "",
      createdAt: toDateInputValue(),
    },
  });

  async function refreshData(selectedMonth: string) {
    setIsLoading(true);

    try {
      const [categoriesResponse, transactionsResponse] = await Promise.all([
        http.get<CategoryDTO[]>("/categories"),
        http.get<TransactionDTO[]>("/transactions", {
          params: { month: selectedMonth },
        }),
      ]);

      setCategories(categoriesResponse.data);
      setTransactions(transactionsResponse.data);
    } catch {
      toast.error("Nao foi possivel atualizar os dados");
    } finally {
      setIsLoading(false);
    }
  }

  async function onCategorySubmit(values: CategoryFormInput) {
    try {
      await http.post("/categories", values);
      toast.success("Categoria criada");
      categoryForm.reset({ name: "" });
      setIsCategoryDialogOpen(false);
      await refreshData(month);
    } catch {
      toast.error("Nao foi possivel criar categoria");
    }
  }

  async function onTransactionSubmit(values: TransactionFormInput) {
    try {
      await http.post("/transactions", values);
      toast.success("Transacao criada");
      transactionForm.reset({
        title: "",
        amount: 0,
        type: values.type,
        categoryId: values.categoryId,
        createdAt: toDateInputValue(),
      });
      setIsTransactionDialogOpen(false);
      await refreshData(month);
    } catch {
      toast.error("Nao foi possivel criar transacao");
    }
  }

  async function onDeleteCategory(id: string) {
    try {
      await http.delete(`/categories/${id}`);
      toast.success("Categoria excluida");
      await refreshData(month);
    } catch {
      toast.error("Categoria em uso ou invalida");
    }
  }

  async function onDeleteTransaction(id: string) {
    try {
      await http.delete(`/transactions/${id}`);
      toast.success("Transacao excluida");
      await refreshData(month);
    } catch {
      toast.error("Nao foi possivel excluir transacao");
    }
  }

  async function onMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    await refreshData(nextMonth);
  }

  const balanceColor = summary.balance >= 0 ? "text-indigo-300" : "text-rose-400";
  const balanceRing =
    summary.balance >= 0
      ? "bg-indigo-500/10 ring-indigo-500/20"
      : "bg-rose-500/10 ring-rose-500/20";

  const tooltipStyle = {
    background: "#151922",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.5rem",
    color: "#f1f5f9",
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 md:p-8">

        {/* ── Header ── */}
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-2.5">
              <Wallet className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Controle financeiro pessoal
              </p>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Minha Carteira</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(event) => void onMonthChange(event.target.value)}
              className="w-full max-w-[10.5rem] bg-card"
            />
            {/* Desktop-only action buttons */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger render={<Button variant="outline" className="hidden md:inline-flex" />}>
                <PlusCircle className="size-4" /> Categoria
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova categoria</DialogTitle>
                  <DialogDescription>Cadastre uma categoria para organizar seus gastos.</DialogDescription>
                </DialogHeader>
                <form className="space-y-3" onSubmit={categoryForm.handleSubmit(onCategorySubmit)}>
                  <Input placeholder="Ex: Alimentação" {...categoryForm.register("name")} />
                  {categoryForm.formState.errors.name ? (
                    <p className="text-xs text-destructive">{categoryForm.formState.errors.name.message}</p>
                  ) : null}
                  <Button type="submit" disabled={categoryForm.formState.isSubmitting} className="w-full">
                    {categoryForm.formState.isSubmitting ? "Salvando..." : "Salvar categoria"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
              <DialogTrigger render={<Button className="hidden md:inline-flex" />}>
                <PlusCircle className="size-4" /> Transação
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova transação</DialogTitle>
                  <DialogDescription>Registre entrada ou saída com validação.</DialogDescription>
                </DialogHeader>
                <form className="grid gap-3" onSubmit={transactionForm.handleSubmit(onTransactionSubmit)}>
                  <Input placeholder="Título" {...transactionForm.register("title")} />
                  {transactionForm.formState.errors.title ? (
                    <p className="text-xs text-destructive">{transactionForm.formState.errors.title.message}</p>
                  ) : null}
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Valor"
                    {...transactionForm.register("amount", { valueAsNumber: true })}
                  />
                  {transactionForm.formState.errors.amount ? (
                    <p className="text-xs text-destructive">{transactionForm.formState.errors.amount.message}</p>
                  ) : null}
                  <select
                    className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
                    {...transactionForm.register("type")}
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Saída</option>
                  </select>
                  <select
                    className="h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
                    {...transactionForm.register("categoryId")}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {transactionForm.formState.errors.categoryId ? (
                    <p className="text-xs text-destructive">{transactionForm.formState.errors.categoryId.message}</p>
                  ) : null}
                  <Input type="date" {...transactionForm.register("createdAt")} />
                  {transactionForm.formState.errors.createdAt ? (
                    <p className="text-xs text-destructive">{transactionForm.formState.errors.createdAt.message}</p>
                  ) : null}
                  <Button type="submit" disabled={transactionForm.formState.isSubmitting}>
                    {transactionForm.formState.isSubmitting ? "Salvando..." : "Salvar transação"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* ── Summary Cards ── */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Card className="border-0 bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <CardHeader className="pb-2 pt-4">
              <div className="mb-1 flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-emerald-400/80">
                  Entradas
                </CardDescription>
                <div className="rounded-full bg-emerald-500/20 p-1">
                  <ArrowUpRight className="size-3.5 text-emerald-400" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <CardTitle className="text-lg font-semibold text-emerald-300 md:text-xl">
                  {formatCurrency(summary.totalIncome)}
                </CardTitle>
              )}
            </CardHeader>
          </Card>

          <Card className="border-0 bg-rose-500/10 ring-1 ring-rose-500/20">
            <CardHeader className="pb-2 pt-4">
              <div className="mb-1 flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-rose-400/80">
                  Saídas
                </CardDescription>
                <div className="rounded-full bg-rose-500/20 p-1">
                  <ArrowDownRight className="size-3.5 text-rose-400" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <CardTitle className="text-lg font-semibold text-rose-300 md:text-xl">
                  {formatCurrency(summary.totalExpense)}
                </CardTitle>
              )}
            </CardHeader>
          </Card>

          <Card className={`col-span-2 border-0 ring-1 lg:col-span-1 ${balanceRing}`}>
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Saldo
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <CardTitle className={`text-lg font-semibold md:text-xl ${balanceColor}`}>
                  {formatCurrency(summary.balance)}
                </CardTitle>
              )}
            </CardHeader>
          </Card>
        </section>

        {/* ── Charts ── */}
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Gastos por categoria</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : expenseByCategoryData.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sem gastos no mês selecionado.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCategoryData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {expenseByCategoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Entradas vs Saídas</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeVsExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "#6b7280", fontSize: 12 }} />
                    <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Transactions + Categories ── */}
        <section className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Transações</CardTitle>
              <CardDescription>Lista atualizada por mês.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma transação encontrada para este mês.</p>
              ) : (
                <>
                  {/* Mobile: card list */}
                  <div className="space-y-2 md:hidden">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className={`flex items-center justify-between rounded-xl p-3 ring-1 ${
                          transaction.type === "income"
                            ? "bg-emerald-500/5 ring-emerald-500/15"
                            : "bg-rose-500/5 ring-rose-500/15"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`shrink-0 rounded-full p-1.5 ${
                              transaction.type === "income" ? "bg-emerald-500/20" : "bg-rose-500/20"
                            }`}
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpRight className="size-3.5 text-emerald-400" />
                            ) : (
                              <ArrowDownRight className="size-3.5 text-rose-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{transaction.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.categoryName} ·{" "}
                              {format(parseISO(transaction.createdAt), "dd MMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="ml-2 flex shrink-0 items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              transaction.type === "income" ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {formatCurrency(transaction.amount)}
                          </span>
                          <Button variant="ghost" size="icon-sm" onClick={() => void onDeleteTransaction(transaction.id)}>
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead>Título</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id} className="border-border/50">
                            <TableCell className="font-medium">{transaction.title}</TableCell>
                            <TableCell
                              className={
                                transaction.type === "income"
                                  ? "font-semibold text-emerald-400"
                                  : "font-semibold text-rose-400"
                              }
                            >
                              {formatCurrency(transaction.amount)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{transaction.categoryName}</TableCell>
                            <TableCell>
                              <Badge
                                variant={transaction.type === "income" ? "secondary" : "outline"}
                                className={
                                  transaction.type === "income"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                    : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                }
                              >
                                {transaction.type === "income" ? "Entrada" : "Saída"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(parseISO(transaction.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => void onDeleteTransaction(transaction.id)}
                              >
                                <Trash2 className="size-4 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Categorias</CardTitle>
              <CardDescription>Gerencie suas categorias.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
                ) : (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(category.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => void onDeleteCategory(category.id)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ── Mobile bottom action bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-border/60 bg-card/95 p-4 backdrop-blur-md md:hidden">
        <Button
          variant="outline"
          className="flex-1 border-border/60"
          onClick={() => setIsCategoryDialogOpen(true)}
        >
          <PlusCircle className="size-4" /> Categoria
        </Button>
        <Button className="flex-1" onClick={() => setIsTransactionDialogOpen(true)}>
          <PlusCircle className="size-4" /> Transação
        </Button>
      </div>
    </div>
  );
}
