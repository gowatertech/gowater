import { CompanyInfo } from "@shared/schema";
import { formatDateTime } from "@/lib/receipt";

interface ReceiptFooterProps {
  companyInfo: CompanyInfo;
  generationDate: Date;
}

export const ReceiptFooter = ({ companyInfo, generationDate }: ReceiptFooterProps) => {
  return (
    <div className="p-3 border-t border-gray-200 text-center">
      <p className="text-receipt-sm">Gracias por su pago</p>
      <p className="text-receipt-xs mt-1">Este documento es una constancia de pago</p>
      <p className="text-receipt-xs">{companyInfo.website}</p>
      <div className="mt-4 text-receipt-xs border-t border-dashed border-gray-300 pt-2">
        <p>Documento generado: {formatDateTime(generationDate)}</p>
      </div>
    </div>
  );
};

export default ReceiptFooter;
