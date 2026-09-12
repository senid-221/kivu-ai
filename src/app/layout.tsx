import "./globals.css";

export const metadata = {
  title: "Eduka",
  description: "Learn. Build. Grow."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}