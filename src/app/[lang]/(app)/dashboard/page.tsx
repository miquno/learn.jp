import { notFound } from "next/navigation";

import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/guards";

export default async function DashboardPage({
  params,
}: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.dashboard.title}
        </h1>
        <p className="mt-1 text-content-muted">
          {dict.dashboard.welcome.replace("{name}", user.username)}
        </p>
      </div>

      <div className="rounded-card border border-dashed border-surface-border bg-surface-raised p-10 text-center text-content-faint">
        {dict.dashboard.empty}
      </div>
    </div>
  );
}
