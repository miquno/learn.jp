import Link from "next/link";
import { notFound } from "next/navigation";

import { ReviewSession } from "@/components/review/review-session";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { requireUser } from "@/lib/auth/guards";
import { getDueCards } from "@/lib/srs/queue";

export default async function ReviewPage({
  params,
}: PageProps<"/[lang]/review">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);
  const items = await getDueCards(user.id, lang);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <span aria-hidden className="font-jp text-5xl text-accent">
          空
        </span>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.review.empty}
        </h1>
        <p className="text-content-muted">{dict.review.emptyBody}</p>
        <Link
          href={`/${lang}/learn/kana`}
          className="mt-2 rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-contrast hover:bg-accent-hover"
        >
          {dict.learn.startLesson}
        </Link>
      </div>
    );
  }

  return <ReviewSession items={items} dict={dict} locale={lang} />;
}
