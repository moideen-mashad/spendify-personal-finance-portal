import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Select } from "../ui/select";
import { DatePicker } from "../ui/date-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarDays, LockKeyhole } from "lucide-react";
import { Dialog } from "../ui/dialog";
import { ErrorBoundary } from "../ErrorBoundary";
import { Skeleton } from "../Feedback";
import api from "../../api/client";
import { useFinance } from "../../hooks/useFinance";
import type { Category, Transaction } from "../../types";
import type { TransactionInput } from "../../types/finance";
import { format } from "date-fns";
const schema = z.object({
  categoryId: z.coerce.number().positive("Choose a category"),
  amount: z.coerce
    .number()
    .positive("Enter an amount greater than zero")
    .max(9999999999.99)
    .refine(
      (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001,
      "Use no more than two decimal places",
    ),
  description: z.string().max(255, "Keep descriptions under 255 characters"),
  txnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
});
export function TransactionDrawer({
  open,
  onClose,
  transaction,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
  onSaved: () => void;
}) {
  const {
    data: categories,
    loading: categoriesLoading,
    error,
    reload,
  } = useFinance<Category[]>("/categories");
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionInput>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (open)
      reset(
        transaction
          ? {
              categoryId: transaction.categoryId,
              amount: transaction.amount,
              description: transaction.description,
              txnDate: transaction.txnDate,
            }
          : {
              categoryId: categories && categories.length > 0 ? categories[0].id : 0,
              amount: "" as unknown as number,
              description: "",
              txnDate: format(new Date(), "yyyy-MM-dd"),
            },
      );
  }, [open, transaction, categories, reset]);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isSubmitting) onClose();
      }}
      drawer
      title={transaction ? "Transaction details" : "Add transaction"}
      description="A little clarity for every money move."
    >
      <ErrorBoundary name="Transaction form">
        <form
          onSubmit={handleSubmit(async (values) => {
            try {
              if (transaction)
                await api.put("/transactions/" + transaction.id, values);
              else await api.post("/transactions", values);
              toast.success(
                transaction ? "Transaction updated" : "Transaction added",
              );
              onSaved();
              onClose();
            } catch {
              toast.error(
                "Couldn’t save your transaction. Your changes are still here.",
              );
            }
          })}
          className="drawer-form"
        >
          <div className="form-intro">
            <CalendarDays size={20} />
            <span>
              {transaction
                ? "Review and edit this entry"
                : "Record income or an expense"}
            </span>
          </div>
          <label>
            Amount
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              className="amount-input"
              {...register("amount")}
            />
            {errors.amount && (
              <span className="field-error">{errors.amount.message}</span>
            )}
          </label>
          <label>
            Description
            <input
              placeholder="What was this for?"
              {...register("description")}
            />
            {errors.description && (
              <span className="field-error">{errors.description.message}</span>
            )}
          </label>
          <label>
            Category
            {categoriesLoading ? (
              <Skeleton height={42} />
            ) : (
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    label="Category"
                    placeholder="Select a category"
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                    invalid={!!errors.categoryId}
                    describedBy={
                      errors.categoryId
                        ? "transaction-category-error"
                        : undefined
                    }
                    options={(categories || []).map((c) => ({
                      value: String(c.id),
                      label: c.name,
                      description: c.type === "income" ? "Income" : "Expense",
                      color: c.color,
                    }))}
                  />
                )}
              />
            )}
            {errors.categoryId && (
              <span id="transaction-category-error" className="field-error">
                {errors.categoryId.message}
              </span>
            )}
            {!categoriesLoading && categories && categories.length === 0 && (
              <span className="subtle" style={{ display: "block", marginTop: 4 }}>
                No categories found. Initializing default categories…
              </span>
            )}
          </label>
          {error && (
            <button type="button" className="button secondary" onClick={reload}>
              Retry loading categories
            </button>
          )}
          <label>
            Date
            <Controller
              name="txnDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  ref={field.ref}
                  label="Date"
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!errors.txnDate}
                  describedBy={
                    errors.txnDate ? "transaction-date-error" : undefined
                  }
                />
              )}
            />
            {errors.txnDate && (
              <span id="transaction-date-error" className="field-error">
                {errors.txnDate.message}
              </span>
            )}
          </label>
          <p className="subtle">
            <LockKeyhole size={14} /> Only you can see your transaction details.
          </p>
          <div className="drawer-footer">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="button primary"
              disabled={isSubmitting || !categories?.length}
            >
              {isSubmitting ? "Saving…" : "Save transaction"}
            </button>
          </div>
        </form>
      </ErrorBoundary>
    </Dialog>
  );
}
