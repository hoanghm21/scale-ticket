import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — ScaleTicket",
  description: "Sign in to ScaleTicket to manage your tickets.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
