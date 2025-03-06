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

  // Sort payments by date
  const sortedPayments = useMemo(() => {
    if (!payments) return [];
    return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pagos</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Factura No.</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Método de Pago</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.customerName || '-'}</TableCell>
                  <TableCell>
                    {new Date(payment.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>#{payment.invoiceNumber}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Detalles del Pago</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>Factura No.: #{payment.invoiceNumber}</p>
                          <p>Cliente: {payment.customerName}</p>
                          <p>Monto: RD$ {parseFloat(payment.amount.toString()).toFixed(2)}</p>
                          <p>Método de Pago: {
                            payment.paymentMethod === 'cash' ? 'Efectivo' :
                            payment.paymentMethod === 'credit' ? 'Crédito' :
                            payment.paymentMethod === 'card' ? 'Tarjeta' :
                            payment.paymentMethod
                          }</p>
                          <p>Fecha: {new Date(payment.date).toLocaleDateString()}</p>
                          {payment.reference && (
                            <p>Referencia: {payment.reference}</p>
                          )}
                          {payment.notes && (
                            <p>Notas: {payment.notes}</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell>
                    {payment.paymentMethod === 'cash' ? 'Efectivo' :
                     payment.paymentMethod === 'credit' ? 'Crédito' :
                     payment.paymentMethod === 'card' ? 'Tarjeta' :
                     payment.paymentMethod}
                  </TableCell>
                  <TableCell>{payment.reference || "-"}</TableCell>
                  <TableCell className="text-right">
                    RD$ {parseFloat(payment.amount.toString()).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}