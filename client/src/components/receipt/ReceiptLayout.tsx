import { Client, CompanyInfo, Payment } from "@shared/schema";
import ReceiptHeader from "./ReceiptHeader";
import ReceiptClientInfo from "./ReceiptClientInfo";
import ReceiptPaymentsList from "./ReceiptPaymentsList";
import ReceiptSummary from "./ReceiptSummary";
import ReceiptFooter from "./ReceiptFooter";
import PrintButton from "./PrintButton";

interface ReceiptLayoutProps {
  client: Client;
  payments: Payment[];
  companyInfo: CompanyInfo;
  summary: {
    invoiceCount: number;
    totalPaid: number;
  };
}

export const ReceiptLayout = ({
  client,
  payments,
  companyInfo,
  summary,
}: ReceiptLayoutProps) => {
  const currentDate = new Date();
  
  return (
    <div className="bg-gray-100 min-h-screen flex justify-center items-start py-8 print:py-0 print:bg-white">
      <PrintButton />
      
      <div className="fixed top-0 left-0 right-0 bg-blue-700 text-white p-2 flex justify-center items-center space-x-4 z-10 no-print">
        <span className="font-semibold">Vista previa de impresión 80mm</span>
      </div>
      
      <div className="receipt-container w-80mm bg-white shadow-lg my-16 mx-auto print:shadow-none print:my-0">
        <ReceiptHeader companyInfo={companyInfo} currentDate={currentDate} />
        <ReceiptClientInfo client={client} />
        <ReceiptPaymentsList payments={payments} />
        <ReceiptSummary 
          invoiceCount={summary.invoiceCount} 
          totalPaid={summary.totalPaid} 
          currency={payments.length > 0 ? payments[0].currency : "PEN"}
        />
        <ReceiptFooter companyInfo={companyInfo} generationDate={currentDate} />
      </div>
    </div>
  );
};

export default ReceiptLayout;
