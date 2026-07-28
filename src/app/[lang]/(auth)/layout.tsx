export default function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      {children}
    </main>
  );
}
