import { buildMetadata } from "@/lib/seo";

const pageMetadata = buildMetadata({
  title: "Daily Supply | Connected Community Commerce",
  description:
    "Discover Daily Supply: connecting neighborhood retailers, daily essentials vendors, and residential communities. In collaboration with VitaTech Solutions and BYP Capital.",
  path: "/products/dailysupply",
  image: "/images/products/dailysupply.png",
  keywords: [
    "dailysupply",
    "Daily Supply",
    "community commerce platform",
    "community retail",
    "supermarket pos billing system",
    "milk subscription software",
    "customer khata credit ledger",
    "residential society marketplace",
  ],
});

export const metadata = { ...pageMetadata, title: { absolute: pageMetadata.title } };

export default function DailySupplyLayout({ children }) {
  return children;
}
