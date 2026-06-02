import type { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "Your Cart — Route Commerce",
  description: "Review and manage your shopping cart. Select pickup stops, adjust quantities, and proceed to checkout.",
  keywords: ["cart", "shopping cart", "produce order", "checkout", "pickup"],
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return <CartClient />;
}