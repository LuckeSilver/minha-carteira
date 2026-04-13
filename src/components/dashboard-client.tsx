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
import { CATEGORY_ICON_OPTIONS, DEFAULT_CATEGORY_ICON, getCategoryIcon } from "@/lib/category-icons";
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

const CHART_COLORS = ["#8b7cff", "#5aa6ff", "#b67cff", "#6f5de7", "#d493ff", "#7b8cff"];

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
      icon: DEFAULT_CATEGORY_ICON,
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
      categoryForm.reset({ name: "", icon: DEFAULT_CATEGORY_ICON });
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

  const balanceColor = summary.balance >= 0 ? "text-violet-100" : "text-pink-200";
  const balanceRing =
    summary.balance >= 0
      ? "bg-violet-400/12 ring-violet-300/18"
      : "bg-pink-400/12 ring-pink-300/18";

  const tooltipStyle = {
    background: "#2b2340",
    border: "1px solid rgba(228, 210, 255, 0.12)",
    borderRadius: "0.5rem",
    color: "#f7f1ff",
  };

  const selectedCategoryIcon = categoryForm.watch("icon");
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  return (
    <div className="min-h-screen bg-background px-3 py-3 pb-24 md:px-6 md:py-8 md:pb-8">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top,#312354_0%,#231a36_42%,#15111f_100%)] p-4 shadow-[0_30px_80px_rgba(15,8,30,0.28)] md:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-44 max-w-5xl rounded-full bg-violet-400/10 blur-3xl" />

        {/* ── Header ── */}
        <header className="relative z-10 flex flex-col gap-4 rounded-[1.75rem] border border-white/8 bg-white/4 px-4 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/10">
              <Wallet className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-violet-100/55">
                Controle financeiro pessoal
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">Minha Carteira</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(event) => void onMonthChange(event.target.value)}
              className="w-full max-w-42 border-white/10 bg-white/8 text-white"
            />
            {/* Desktop-only action buttons */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger render={<Button variant="outline" className="hidden border-white/10 bg-white/8 text-white hover:bg-white/12 md:inline-flex" />}>
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
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Ícone</p>
                    <div className="grid grid-cols-5 gap-2">
                      {CATEGORY_ICON_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isActive = selectedCategoryIcon === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => categoryForm.setValue("icon", option.value, { shouldValidate: true })}
                            className={`flex aspect-square items-center justify-center rounded-xl border transition ${
                              isActive
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-white/8 bg-white/5 text-muted-foreground hover:bg-white/10"
                            }`}
                            aria-label={option.label}
                            title={option.label}
                          >
                            <Icon className="size-4" />
                          </button>
                        );
                      })}
                    </div>
                    {categoryForm.formState.errors.icon ? (
                      <p className="text-xs text-destructive">{categoryForm.formState.errors.icon.message}</p>
                    ) : null}
                  </div>
                  <Button type="submit" disabled={categoryForm.formState.isSubmitting} className="w-full">
                    {categoryForm.formState.isSubmitting ? "Salvando..." : "Salvar categoria"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
              <DialogTrigger render={<Button className="hidden bg-white text-slate-900 hover:bg-white/90 md:inline-flex" />}>
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
                    className="h-9 rounded-lg border border-white/10 bg-white/8 px-3 text-sm text-white"
                    {...transactionForm.register("type")}
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Saída</option>
                  </select>
                  <select
                    className="h-9 rounded-lg border border-white/10 bg-white/8 px-3 text-sm text-white"
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
        <section className="relative z-10 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(122,93,182,0.34),rgba(91,67,142,0.18))] shadow-none">
            <CardHeader className="pb-2 pt-4">
              <div className="mb-1 flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-violet-100/65">
                  Entradas
                </CardDescription>
                <div className="rounded-full bg-white/14 p-1">
                  <ArrowUpRight className="size-3.5 text-violet-100" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <CardTitle className="text-lg font-semibold text-white md:text-xl">
                  {formatCurrency(summary.totalIncome)}
                </CardTitle>
              )}
            </CardHeader>
          </Card>

          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(122,93,182,0.34),rgba(91,67,142,0.18))] shadow-none">
            <CardHeader className="pb-2 pt-4">
              <div className="mb-1 flex items-center justify-between">
                <CardDescription className="text-xs font-medium uppercase tracking-wider text-violet-100/65">
                  Saídas
                </CardDescription>
                <div className="rounded-full bg-white/14 p-1">
                  <ArrowDownRight className="size-3.5 text-violet-100" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <CardTitle className="text-lg font-semibold text-white md:text-xl">
                  {formatCurrency(summary.totalExpense)}
                </CardTitle>
              )}
            </CardHeader>
          </Card>

          <Card className={`col-span-2 border-white/8 shadow-none lg:col-span-1 ${balanceRing}`}>
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="mb-1 text-xs font-medium uppercase tracking-wider text-violet-100/65">
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
        <section className="relative z-10 grid gap-4 lg:grid-cols-2">
          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(42,31,69,0.88),rgba(28,22,43,0.92))] shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-white">Gastos por categoria</CardTitle>
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

          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(42,31,69,0.88),rgba(28,22,43,0.92))] shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-white">Entradas vs Saídas</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeVsExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(218,201,255,0.09)" />
                    <XAxis dataKey="name" tick={{ fill: "#c5b7e6", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#c5b7e6", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ color: "#d9cef5", fontSize: 12 }} />
                    <Bar dataKey="value" fill="#8d7dff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Transactions + Categories ── */}
        <section className="relative z-10 grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(24,18,37,0.92),rgba(18,14,28,0.94))] shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-white">Transações</CardTitle>
              <CardDescription className="text-violet-100/55">Lista atualizada por mês.</CardDescription>
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
                        className={`flex items-center justify-between rounded-xl border border-white/6 p-3 ${
                          transaction.type === "income"
                            ? "bg-white/6"
                            : "bg-white/4"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`shrink-0 rounded-full p-1.5 ${
                              transaction.type === "income" ? "bg-violet-400/16" : "bg-pink-300/12"
                            }`}
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpRight className="size-3.5 text-violet-100" />
                            ) : (
                              <ArrowDownRight className="size-3.5 text-pink-100" />
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
                        {transactions.map((transaction) => {
                          const category = categoryMap.get(transaction.categoryId);
                          const CategoryIcon = getCategoryIcon(category?.icon ?? DEFAULT_CATEGORY_ICON);

                          return (
                          <TableRow key={transaction.id} className="border-white/6">
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
                            <TableCell className="text-violet-100/70">
                              <span className="inline-flex items-center gap-2">
                                <span className="rounded-md bg-white/8 p-1 text-violet-100/85">
                                  <CategoryIcon className="size-3.5" />
                                </span>
                                {transaction.categoryName}
                              </span>
                            </TableCell>
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
                            <TableCell className="text-violet-100/70">
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
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/8 bg-[linear-gradient(180deg,rgba(24,18,37,0.92),rgba(18,14,28,0.94))] shadow-none">
            <CardHeader>
              <CardTitle className="text-base text-white">Categorias</CardTitle>
              <CardDescription className="text-violet-100/55">Gerencie suas categorias.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
                ) : (
                  categories.map((category) => {
                    const CategoryIcon = getCategoryIcon(category.icon);

                    return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-lg border border-white/6 bg-white/4 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-white/8 p-2 text-violet-100/85">
                          <CategoryIcon className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{category.name}</p>
                          <p className="text-xs text-violet-100/55">
                            {format(parseISO(category.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => void onDeleteCategory(category.id)}>
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ── Mobile bottom action bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-white/8 bg-[#1d1629]/92 p-4 backdrop-blur-md md:hidden">
        <Button
          variant="outline"
          className="flex-1 border-white/10 bg-white/6 text-white hover:bg-white/10"
          onClick={() => setIsCategoryDialogOpen(true)}
        >
          <PlusCircle className="size-4" /> Categoria
        </Button>
        <Button className="flex-1 bg-white text-slate-900 hover:bg-white/90" onClick={() => setIsTransactionDialogOpen(true)}>
          <PlusCircle className="size-4" /> Transação
        </Button>
      </div>
    </div>
  );
}
