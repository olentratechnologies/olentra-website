import Image from "next/image";
import { products } from "@/data/products-data";
import styles from "./ProductLogo.module.css";

export default function ProductLogo({
  product,
  className = "",
  priority = false,
  decorative = false,
  variant = "hero",
}) {
  const brand = products.find((entry) => entry.id === product);
  const logo = variant === "nav" ? brand?.navLogo || brand?.logo : brand?.logo;

  if (!logo) return null;

  return (
    <Image
      src={logo.src}
      alt={decorative ? "" : brand.title}
      width={logo.width}
      height={logo.height}
      sizes={variant === "nav" ? "44px" : variant === "card" ? "(max-width: 767px) calc(100vw - 72px), (max-width: 1023px) 45vw, 320px" : "(max-width: 640px) 96px, 128px"}
      preload={priority}
      className={`${styles.logo} ${styles[variant] || ""} ${className}`.trim()}
    />
  );
}
