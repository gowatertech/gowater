import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertSettingsSchema, type Settings } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm({
    resolver: zodResolver(insertSettingsSchema),
    defaultValues: {
      name: settings?.name || "",
      address: settings?.address || "",
      phone: settings?.phone || "",
      logo: settings?.logo || "",
      driverCommission: settings?.driverCommission || 3,
      assistantCommission: settings?.assistantCommission || 2,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: Settings) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: t("success"),
        description: t("Settings updated successfully"),
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message,
      });
    },
  });

  const onSubmit = (data: Settings) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t("settings")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("Company Information")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("address")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phone")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Logo URL")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="driverCommission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Driver Commission (RD$)")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assistantCommission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("Assistant Commission (RD$)")}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? t("Saving...") : t("save")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
