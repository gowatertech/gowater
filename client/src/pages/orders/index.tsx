import { useTranslation } from "react-i18next";

export default function Orders() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">{t("orders")}</h1>
    </div>
  );
}