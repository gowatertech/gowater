import { useTranslation } from "react-i18next";
// Component code will be added in next iteration
export default function BottleReturns() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("bottleReturns")}</h1>
    </div>
  );
}
