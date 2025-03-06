import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
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
import { Search, FileText } from "lucide-react";

export default function Payments() {
  const { t } = useTranslation();
  
  // Fetch payments and customers data
  const { data: payments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // State for customer filter
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    let filtered = [...payments];
    
    // Filter by customer if selected
    if (selectedCustomer !== "all") {
      filtered = filtered.filter(p => p.customerId === parseInt(selectedCustomer));
    }
    
    // Sort by date, newest first
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return filtered;
  }, [payments, selectedCustomer]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t("payments")}</h1>
        
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
          <CardTitle>{t("paymentHistory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("amount")}</TableHead>
                <TableHead>{t("paymentMethod")}</TableHead>
                <TableHead>{t("reference")}</TableHead>
                <TableHead>{t("invoice")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const customer = customers?.find(c => c.id === payment.customerId);
                
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{customer?.name}</TableCell>
                    <TableCell>
                      RD$ {parseFloat(payment.amount.toString()).toFixed(2)}
                    </TableCell>
                    <TableCell>{t(payment.paymentMethod)}</TableCell>
                    <TableCell>{payment.reference || "-"}</TableCell>
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
                          {/* Invoice details content */}
                          <div className="space-y-4">
                            <p>{t("orderNumber")}: #{payment.orderId}</p>
                            <p>{t("customer")}: {customer?.name}</p>
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
