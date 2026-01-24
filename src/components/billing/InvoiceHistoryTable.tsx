import { format } from "date-fns";
import { Download, ExternalLink, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Invoice } from "@/hooks/useBilling";

interface InvoiceHistoryTableProps {
  invoices: Invoice[] | undefined;
  isLoading: boolean;
}

export function InvoiceHistoryTable({ invoices, isLoading }: InvoiceHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No billing history yet</p>
        <p className="text-sm">Invoices will appear here after your first payment</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success/10 text-success border-success/30">Paid</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell>
              {invoice.paid_at
                ? format(new Date(invoice.paid_at), "MMM d, yyyy")
                : format(new Date(invoice.created_at), "MMM d, yyyy")}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {invoice.period_start && invoice.period_end
                ? `${format(new Date(invoice.period_start), "MMM d")} - ${format(
                    new Date(invoice.period_end),
                    "MMM d, yyyy"
                  )}`
                : "-"}
            </TableCell>
            <TableCell className="font-medium">
              {formatAmount(invoice.amount_paid || invoice.amount_due, invoice.currency)}
            </TableCell>
            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                {invoice.invoice_pdf && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(invoice.invoice_pdf!, "_blank")}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                {invoice.hosted_invoice_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(invoice.hosted_invoice_url!, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
