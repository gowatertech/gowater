import { Client } from "@shared/schema";

interface ReceiptClientInfoProps {
  client: Client;
}

export const ReceiptClientInfo = ({ client }: ReceiptClientInfoProps) => {
  return (
    <div className="p-3 border-b border-gray-200">
      <table className="w-full text-receipt-base">
        <tbody>
          <tr>
            <td className="w-1/3 font-semibold">Cliente:</td>
            <td>{client.name}</td>
          </tr>
          <tr>
            <td className="font-semibold">Documento:</td>
            <td>{client.documentNumber}</td>
          </tr>
          <tr>
            <td className="font-semibold">Dirección:</td>
            <td>{client.address}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ReceiptClientInfo;
