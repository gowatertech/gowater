import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

interface Warehouse {
  id: number;
  code: string;
  name: string;
  status: 'active' | 'inactive';
}

interface WarehouseForm {
  code: string;
  name: string;
  status: 'active' | 'inactive';
}

export default function WarehouseManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const form = useForm<WarehouseForm>({
    defaultValues: {
      code: "",
      name: "",
      status: "active"
    }
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["/api/warehouses"],
    staleTime: 10000
  });

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: async (data: WarehouseForm) => {
      const response = await apiRequest("POST", "/api/warehouses", data);
      if (!response.ok) {
        throw new Error("Failed to create warehouse");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({
        title: t("success"),
        description: t("warehouseCreated")
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: async (data: WarehouseForm & { id: number }) => {
      const response = await apiRequest("PATCH", `/api/warehouses/${data.id}`, data);
      if (!response.ok) {
        throw new Error("Failed to update warehouse");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({
        title: t("success"),
        description: t("warehouseUpdated")
      });
      setEditingWarehouse(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t("error"),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: WarehouseForm) => {
    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ ...data, id: editingWarehouse.id });
    } else {
      createWarehouseMutation.mutate(data);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    form.reset({
      code: warehouse.code,
      name: warehouse.name,
      status: warehouse.status
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-4">{t("warehouseManagement")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {editingWarehouse ? t("edit") : t("create")} {t("warehouse").toLowerCase()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("code")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("name")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("status")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t("active")}</SelectItem>
                          <SelectItem value="inactive">{t("inactive")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}>
                  {editingWarehouse ? t("edit") : t("create")}
                </Button>
                {editingWarehouse && (
                  <Button variant="outline" onClick={() => {
                    setEditingWarehouse(null);
                    form.reset();
                  }}>
                    {t("cancel")}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("warehouses")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("code")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No warehouses found
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((warehouse: Warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>{warehouse.code}</TableCell>
                    <TableCell>{warehouse.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        warehouse.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {t(warehouse.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(warehouse)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
