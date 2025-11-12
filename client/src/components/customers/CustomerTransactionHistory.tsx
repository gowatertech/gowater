import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Scroll, TrendingUp, TrendingDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface Transaction {
  id: number;
  documentNumber: string;
  documentType: string;
  date: string;
  description: string;
  debit: string | null;
  credit: string | null;
  balance: string;
}

interface CustomerTransactionHistoryProps {
  customerId: number;
}

export function CustomerTransactionHistory({ customerId }: CustomerTransactionHistoryProps) {
  const isMobile = useIsMobile();
  
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/customers", customerId, "transactions"],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${customerId}/transactions`);
      if (!response.ok) {
        throw new Error("Error al obtener transacciones");
      }
      return await response.json();
    },
  });

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FT: "Factura",
      RI: "Recibo",
      ANT: "Anticipo",
      CXC: "CxC Inicial",
      GS: "Gasto",
      NC: "Nota Crédito",
      ND: "Nota Débito",
    };
    return labels[type] || type;
  };

  const getDocumentTypeBadge = (type: string) => {
    const config: Record<string, string> = {
      FT: "bg-green-600 text-white hover:bg-green-700",
      RI: "bg-blue-600 text-white hover:bg-blue-700",
      ANT: "bg-blue-600 text-white hover:bg-blue-700",
      CXC: "bg-red-600 text-white hover:bg-red-700",
      GS: "bg-gray-600 text-white hover:bg-gray-700",
      NC: "bg-green-600 text-white hover:bg-green-700",
      ND: "bg-red-600 text-white hover:bg-red-700",
    };
    const className = config[type] || "bg-gray-600 text-white hover:bg-gray-700";
    return <Badge className={className}>{getDocumentTypeLabel(type)}</Badge>;
  };

  const formatCurrency = (value: string | null) => {
    if (!value) return "-";
    return `RD$ ${parseFloat(value).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scroll className="h-4 w-4" />
            Historial de Transacciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scroll className="h-4 w-4" />
            Historial de Transacciones
          </CardTitle>
          <CardDescription className="text-xs">
            Registro completo de movimientos del cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay transacciones registradas
          </p>
        </CardContent>
      </Card>
    );
  }

  // Vista móvil con tarjetas
  if (isMobile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scroll className="h-4 w-4" />
            Historial de Transacciones
          </CardTitle>
          <CardDescription className="text-xs">
            {transactions.length} {transactions.length === 1 ? "transacción registrada" : "transacciones registradas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="border rounded-lg p-3 space-y-2"
                data-testid={`transaction-card-${transaction.id}`}
              >
                {/* Primera línea: Documento, Tipo, Fecha */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-mono text-xs font-semibold">
                      {transaction.documentNumber}
                    </span>
                    {getDocumentTypeBadge(transaction.documentType)}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(transaction.date), "dd/MM/yy", { locale: es })}
                  </span>
                </div>

                {/* Segunda línea: Descripción */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {transaction.description}
                </p>

                {/* Tercera línea: Débito, Crédito, Balance */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Débito</p>
                    {transaction.debit ? (
                      <p className="text-xs font-semibold text-red-600 flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatCurrency(transaction.debit)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">-</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Crédito</p>
                    {transaction.credit ? (
                      <p className="text-xs font-semibold text-green-600 flex items-center justify-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {formatCurrency(transaction.credit)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">-</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">Balance</p>
                    <p className="text-xs font-bold">
                      {formatCurrency(transaction.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista desktop con tabla
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scroll className="h-4 w-4" />
          Historial de Transacciones
        </CardTitle>
        <CardDescription className="text-xs">
          {transactions.length} {transactions.length === 1 ? "transacción registrada" : "transacciones registradas"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Documento</TableHead>
                <TableHead className="w-[120px]">Tipo</TableHead>
                <TableHead className="w-[100px]">Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right w-[100px]">Débito</TableHead>
                <TableHead className="text-right w-[100px]">Crédito</TableHead>
                <TableHead className="text-right w-[100px]">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                  <TableCell className="font-mono text-xs">{transaction.documentNumber}</TableCell>
                  <TableCell>{getDocumentTypeBadge(transaction.documentType)}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(transaction.date), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={transaction.description}>
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {transaction.debit ? (
                      <span className="text-red-600 flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatCurrency(transaction.debit)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {transaction.credit ? (
                      <span className="text-green-600 flex items-center justify-end gap-1">
                        <TrendingDown className="h-3 w-3" />
                        {formatCurrency(transaction.credit)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(transaction.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
