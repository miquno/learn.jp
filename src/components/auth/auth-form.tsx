"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AuthFormState } from "@/app/[lang]/(auth)/actions";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";

type Props = {
  mode: "login" | "register";
  locale: Locale;
  dict: Dictionary;
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

const fieldClass =
  "w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2.5 text-content-strong placeholder:text-content-faint";

export function AuthForm({ mode, locale, dict, action }: Props) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    {},
  );
  const isRegister = mode === "register";

  const errorMessage =
    state.error === "taken"
      ? dict.auth.errorTaken
      : state.error === "generic"
        ? dict.auth.errorGeneric
        : state.error
          ? dict.auth.errorInvalid
          : null;

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold text-content-strong">
        {isRegister ? dict.auth.registerTitle : dict.auth.loginTitle}
      </h1>
      <p className="mt-1 text-sm text-content-muted">
        {isRegister ? dict.auth.registerSubtitle : dict.auth.loginSubtitle}
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />

        <label className="flex flex-col gap-1.5 text-sm text-content-muted">
          {dict.auth.email}
          <input
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>

        {isRegister && (
          <label className="flex flex-col gap-1.5 text-sm text-content-muted">
            {dict.auth.username}
            <input
              className={fieldClass}
              type="text"
              name="username"
              autoComplete="username"
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_]+"
              required
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm text-content-muted">
          {dict.auth.password}
          <input
            className={fieldClass}
            type="password"
            name="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 8 : undefined}
            required
          />
        </label>

        {errorMessage && (
          <p role="alert" className="text-sm text-negative">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-lg bg-accent px-4 py-2.5 font-medium text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {isRegister ? dict.auth.submitRegister : dict.auth.submitLogin}
        </button>
      </form>

      <Link
        href={`/${locale}/${isRegister ? "login" : "register"}`}
        className="mt-6 inline-block text-sm text-content-muted underline-offset-4 hover:text-content-base hover:underline"
      >
        {isRegister ? dict.auth.switchToLogin : dict.auth.switchToRegister}
      </Link>
    </div>
  );
}
