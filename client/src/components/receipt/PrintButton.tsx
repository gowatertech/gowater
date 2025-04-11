import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  onClick?: () => void;
}

export const PrintButton = ({ onClick }: PrintButtonProps) => {
  const handlePrint = () => {
    if (onClick) onClick();
    window.print();
  };
  
  return (
    <Button 
      onClick={handlePrint}
      className="no-print fixed top-4 right-4 z-10 bg-blue-700 hover:bg-blue-800 text-white"
    >
      <Printer className="mr-2 h-4 w-4" />
      Imprimir
    </Button>
  );
};

export default PrintButton;
