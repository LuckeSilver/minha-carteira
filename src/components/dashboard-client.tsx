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
import { PlusCircle, Trash2, Wallet } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";

type CategoryFormInput = z.infer<typeof categorySchema>;
type TransactionFormInput = z.infer<typeof transactionSchema>;

type Props = {
  initialData: DashboardResponse;
};

const CHART_COLORS = ["#e76f51", "#2a9d8f", "#f4a261", "#264653", "#e9c46a", "#3d5a80"];

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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fef3c7,#f8fafc_45%,#ecfeff)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
        <header className="rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Controle financeiro pessoal</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
                <Wallet className="size-6" /> Minha Carteira
              </h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="month"
                value={month}
                onChange={(event) => void onMonthChange(event.target.value)}
                className="w-full sm:w-44"
              />
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger render={<Button variant="outline" className="w-full sm:w-auto" />}>
                  <PlusCircle /> Categoria
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova categoria</DialogTitle>
                    <DialogDescription>Cadastre uma categoria para organizar seus gastos.</DialogDescription>
                  </DialogHeader>
                  <form className="space-y-3" onSubmit={categoryForm.handleSubmit(onCategorySubmit)}>
                    <Input placeholder="Ex: Alimentacao" {...categoryForm.register("name")} />
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
                <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
                  <PlusCircle /> Transacao
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nova transacao</DialogTitle>
                    <DialogDescription>Registre entrada ou saida com validacao.</DialogDescription>
                  </DialogHeader>
                  <form className="grid gap-3" onSubmit={transactionForm.handleSubmit(onTransactionSubmit)}>
                    <Input placeholder="Titulo" {...transactionForm.register("title")} />
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
                      className="h-9 rounded-lg border bg-background px-3 text-sm"
                      {...transactionForm.register("type")}
                    >
                      <option value="income">Entrada</option>
                      <option value="expense">Saida</option>
                    </select>

                    <select
                      className="h-9 rounded-lg border bg-background px-3 text-sm"
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
                      {transactionForm.formState.isSubmitting ? "Salvando..." : "Salvar transacao"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total de entradas</CardDescription>
              <CardTitle className="text-2xl text-emerald-600">{formatCurrency(summary.totalIncome)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total de saidas</CardDescription>
              <CardTitle className="text-2xl text-rose-600">{formatCurrency(summary.totalExpense)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Saldo atual</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(summary.balance)}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por categoria</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : expenseByCategoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem gastos no mes selecionado.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCategoryData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {expenseByCategoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entradas vs Saidas</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeVsExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="value" fill="#2a9d8f" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Transacoes</CardTitle>
              <CardDescription>Lista atualizada por mes.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma transacao encontrada para este mes.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Titulo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Acao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.title}</TableCell>
                        <TableCell className={transaction.type === "income" ? "text-emerald-600" : "text-rose-600"}>
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>{transaction.categoryName}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === "income" ? "secondary" : "outline"}>
                            {transaction.type === "income" ? "Entrada" : "Saida"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(transaction.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="destructive" size="icon-sm" onClick={() => void onDeleteTransaction(transaction.id)}>
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorias</CardTitle>
              <CardDescription>Gerencie suas categorias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{category.name}</p>
                      <Button variant="ghost" size="icon-sm" onClick={() => void onDeleteCategory(category.id)}>
                        <Trash2 className="text-rose-600" />
                      </Button>
                    </div>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Criada em {format(parseISO(category.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
