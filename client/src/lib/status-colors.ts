export const getStatusColor = (status: string): string => {
  switch (status) {
    case "pending":
      return "bg-green-50 text-green-700";
    case "in_progress":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-green-700 text-white";
    case "cancelled":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "in_progress":
      return "En progreso";
    case "completed":
      return "Completada";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
  }
};
