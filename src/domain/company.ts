export type CompanyProfile = {
  name: string;
  description: string;
  services: string[];
  website: string | null;
  contacts: { email: string | null; phone: string | null; telegram: string | null };
  logo: string | null;
  colors: { primary: string; accent: string };
  hourlyRate: number | null;
  currency: string;
};

export const companyProfile: CompanyProfile = {
  name: "Applic",
  description:
    "Applic LLC — українська IT-компанія, з 2023 року, входить до групи IT Artel Group (23 роки у впровадженні ERP і розробці ПЗ). Розробляємо web-, мобільні й кастомні рішення та впроваджуємо ШІ — від концепції до робочого продукту і підтримки після запуску.",
  services: [
    "Розробка web-застосунків",
    "Розробка мобільних застосунків",
    "Кастомні рішення під задачі бізнесу",
    "Впровадження ШІ: асистенти, MCP-конектори, аналітика",
    "Підтримка і розвиток після запуску",
  ],
  website: "https://www.applic.com.ua",
  contacts: { email: "sale@applic.com.ua", phone: null, telegram: null },
  logo: "/logo.svg",
  colors: { primary: "#101820", accent: "#FE5000" },
  hourlyRate: 50,
  currency: "EUR",
};
