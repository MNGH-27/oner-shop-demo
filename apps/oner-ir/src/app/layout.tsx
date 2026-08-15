import type { Metadata } from "next";
import "./globals.css";
import "./features.css";
import "react-toastify/dist/ReactToastify.css";
import { CartDrawer } from "@components/modules/cart/CartDrawer";
import { SiteFooter } from "@components/partials/layouts/SiteFooter";
import { SiteHeader } from "@components/partials/layouts/SiteHeader";
import { AppProvider } from "@components/partials/providers/AppProvider";
export const metadata: Metadata = { title: { default: "Oner | کالای خواب کودک", template: "%s | Oner" }, description: "کالای خواب و منسوجات کودک Oner؛ طراحی آرام، پارچه‌های لطیف و دوخت ماندگار." };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="fa" dir="rtl"><body><AppProvider><SiteHeader/><main>{children}</main><SiteFooter/><CartDrawer/></AppProvider></body></html> }
