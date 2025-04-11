import { CompanyInfo } from "@shared/schema";
import { formatDate, formatTime } from "@/lib/receipt";

interface ReceiptHeaderProps {
  companyInfo: CompanyInfo;
  currentDate: Date;
}

export const ReceiptHeader = ({ companyInfo, currentDate }: ReceiptHeaderProps) => {
  return (
    <div className="border-b border-gray-200 p-3 text-center">
      <h1 className="text-receipt-lg font-bold">{companyInfo.name}</h1>
      <p className="text-receipt-sm">RUC: {companyInfo.ruc}</p>
      <p className="text-receipt-sm">Dirección: {companyInfo.address}</p>
      <p className="text-receipt-sm">Tel: {companyInfo.phone}</p>
      <h2 className="text-receipt-base font-bold mt-2">LISTA DE PAGOS</h2>
      <p className="text-receipt-sm mt-1">Fecha: {formatDate(currentDate)}</p>
      <p className="text-receipt-sm">Hora: {formatTime(currentDate)}</p>
    </div>
  );
};

export default ReceiptHeader;
