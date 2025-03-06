import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { type Order, type Customer } from "@shared/schema";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default function Billing() {
  const { t } = useTranslation();
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");

  // Fetch orders and customers data
  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    let filtered = [...orders];

    // Filter by customer if selected
    if (selectedCustomer !== "all") {
      filtered = filtered.filter(o => o.customerId === parseInt(selectedCustomer));
    }

    // Sort by date, newest first
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return filtered;
  }, [orders, selectedCustomer]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("billing")}</h1>

        {/* Customer filter */}
        <div className="flex gap-4 items-center">
          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t("selectCustomer")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCustomers")}</SelectItem>
              {customers?.map(customer => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("invoices")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("paymentMethod")}</TableHead>
                <TableHead>{t("invoice")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const customer = customers?.find(c => c.id === order.customerId);

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      {new Date(order.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{customer?.name}</TableCell>
                    <TableCell>
                      RD$ {parseFloat(order.total.toString()).toFixed(2)}
                    </TableCell>
                    <TableCell>{t(order.status)}</TableCell>
                    <TableCell>{t(order.paymentMethod)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("invoiceDetails")}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p>{t("orderNumber")}: #{order.id}</p>
                            <p>{t("customer")}: {customer?.name}</p>
                            <p>{t("amount")}: RD$ {parseFloat(order.total.toString()).toFixed(2)}</p>
                            <p>{t("status")}: {t(order.status)}</p>
                            <p>{t("paymentMethod")}: {t(order.paymentMethod)}</p>
                            <p>{t("date")}: {new Date(order.date).toLocaleDateString()}</p>
                          </div>
                        </DialogContent>
                      </Dialog>
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
