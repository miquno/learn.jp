import { notFound } from "next/navigation";

import { register } from "@/app/[lang]/(auth)/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function RegisterPage({
  params,
}: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  return (
    <AuthForm mode="register" locale={lang} dict={dict} action={register} />
  );
}
