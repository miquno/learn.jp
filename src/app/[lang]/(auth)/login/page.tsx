import { notFound } from "next/navigation";

import { login } from "@/app/[lang]/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function LoginPage({
  params,
}: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  return <AuthForm mode="login" locale={lang} dict={dict} action={login} />;
}
