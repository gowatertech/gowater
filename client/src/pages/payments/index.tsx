import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type Payment, type Customer } from "@shared/schema";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default function Payments() {
  const { t } = useTranslation();

  // Fetch payments and customers data
  const { data: payments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Sort payments by date
  const sortedPayments = useMemo(() => {
    if (!payments) return [];
    return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("payments")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("paymentHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("client")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("invoiceNo")}</TableHead>
                <TableHead>{t("details")}</TableHead>
                <TableHead>{t("paymentMethod")}</TableHead>
                <TableHead>{t("reference")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPayments.map((payment) => {
                const customer = customers?.find(c => c.id === payment.customerId);
                return (
                  <TableRow key={payment.id}>
                    <TableCell>{customer?.name || '-'}</TableCell>
                    <TableCell>
                      {new Date(payment.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>#{payment.orderId}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("paymentDetails")}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p>{t("invoiceNo")}: #{payment.orderId}</p>
                            <p>{t("client")}: {customer?.name}</p>
                            <p>{t("amount")}: RD$ {parseFloat(payment.amount.toString()).toFixed(2)}</p>
                            <p>{t("paymentMethod")}: {t(payment.paymentMethod)}</p>
                            <p>{t("date")}: {new Date(payment.date).toLocaleDateString()}</p>
                            {payment.reference && (
                              <p>{t("reference")}: {payment.reference}</p>
                            )}
                            {payment.notes && (
                              <p>{t("notes")}: {payment.notes}</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>{t(payment.paymentMethod)}</TableCell>
                    <TableCell>{payment.reference || "-"}</TableCell>
                    <TableCell className="text-right">
                      RD$ {parseFloat(payment.amount.toString()).toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}