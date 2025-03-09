import { useTranslation } from "react-i18next";
// Component code will be added in next iteration
export default function BottleBalance() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("bottleBalance")}</h1>
    </div>
  );
}
