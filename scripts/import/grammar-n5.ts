/**
 * N5 grammar, hand-written.
 *
 * No open dataset for JLPT grammar exists, so the content lives here in code —
 * written by hand rather than generated, the same way the shop catalogue and
 * kana table are. The code is the source of truth: re-running updates the text
 * from this file, so edit here, not in the database.
 *
 * Every point still lands `reviewed: false` on first insert and stays hidden
 * from learners until a human checks it (see scripts/import/grammar.ts and the
 * lesson query). Re-running does NOT flip an already-reviewed point back — the
 * upsert leaves the flag alone on update, so a release survives a re-seed.
 *
 * Order is the teaching sequence: copula and particles first, then polite verb
 * forms, then adjectives, then wants/permissions, then connectors and time.
 * Example sentences stay within N5 vocabulary and common kanji.
 */
import { db } from "./lib/db";
import { progress } from "./lib/source";

type Entry = {
  slug: string;
  title: string;
  structure: string;
  meaning: { en: string; de: string };
  explanation: { en: string; de: string };
  examples: { japanese: string; en: string; de: string }[];
};

const N5: Entry[] = [
  {
    slug: "n5-desu",
    title: "〜です",
    structure: "noun + です",
    meaning: { en: "is / am / are (polite)", de: "sein (höflich)" },
    explanation: {
      en: "です follows a noun to make a polite statement of what something is. It is the polite form of the plain copula だ.",
      de: "です folgt einem Nomen und bildet eine höfliche Aussage darüber, was etwas ist. Es ist die höfliche Form der einfachen Kopula だ.",
    },
    examples: [
      { japanese: "私は学生です。", en: "I am a student.", de: "Ich bin Student." },
      { japanese: "これは本です。", en: "This is a book.", de: "Das ist ein Buch." },
    ],
  },
  {
    slug: "n5-wa-particle",
    title: "〜は",
    structure: "topic + は",
    meaning: { en: "as for … (topic marker)", de: "was … betrifft (Themapartikel)" },
    explanation: {
      en: "は (pronounced “wa”) marks the topic — what the sentence is about. Everything after it is a comment on that topic.",
      de: "は (ausgesprochen „wa“) markiert das Thema — worum es im Satz geht. Alles danach ist eine Aussage über dieses Thema.",
    },
    examples: [
      { japanese: "私は日本人です。", en: "I am Japanese.", de: "Ich bin Japaner." },
      { japanese: "今日は寒いです。", en: "Today is cold.", de: "Heute ist es kalt." },
    ],
  },
  {
    slug: "n5-mo",
    title: "〜も",
    structure: "noun + も",
    meaning: { en: "also / too", de: "auch" },
    explanation: {
      en: "も replaces は or が to mean “also” or “too”. It says the same thing is true for this item as well.",
      de: "も ersetzt は oder が und bedeutet „auch“. Es sagt, dass dasselbe auch für diesen Fall gilt.",
    },
    examples: [
      { japanese: "私も学生です。", en: "I am a student too.", de: "Ich bin auch Student." },
      { japanese: "これもください。", en: "This one too, please.", de: "Das hier auch, bitte." },
    ],
  },
  {
    slug: "n5-no-possessive",
    title: "〜の",
    structure: "noun + の + noun",
    meaning: { en: "'s / of (linking nouns)", de: "von / -s (Nomen verbinden)" },
    explanation: {
      en: "の joins two nouns; the first one modifies the second. It covers possession (“my book”) and belonging (“a Japanese teacher”).",
      de: "の verbindet zwei Nomen; das erste bestimmt das zweite näher. Es deckt Besitz („mein Buch“) und Zugehörigkeit („ein Japanischlehrer“) ab.",
    },
    examples: [
      { japanese: "これは私の本です。", en: "This is my book.", de: "Das ist mein Buch." },
      { japanese: "日本語の先生", en: "a Japanese teacher", de: "ein Japanischlehrer" },
    ],
  },
  {
    slug: "n5-ka-question",
    title: "〜か",
    structure: "sentence + か",
    meaning: { en: "makes a question", de: "bildet eine Frage" },
    explanation: {
      en: "Adding か to the end of a sentence turns it into a question. No change in word order is needed.",
      de: "Ein か am Satzende macht aus dem Satz eine Frage. Die Wortstellung ändert sich nicht.",
    },
    examples: [
      { japanese: "これは何ですか。", en: "What is this?", de: "Was ist das?" },
      { japanese: "学生ですか。", en: "Are you a student?", de: "Bist du Student?" },
    ],
  },
  {
    slug: "n5-o-object",
    title: "〜を",
    structure: "object + を + verb",
    meaning: { en: "marks the direct object", de: "markiert das direkte Objekt" },
    explanation: {
      en: "を (pronounced “o”) marks the direct object — the thing the action is done to.",
      de: "を (ausgesprochen „o“) markiert das direkte Objekt — das, woran die Handlung geschieht.",
    },
    examples: [
      { japanese: "パンを食べます。", en: "I eat bread.", de: "Ich esse Brot." },
      { japanese: "水を飲みます。", en: "I drink water.", de: "Ich trinke Wasser." },
    ],
  },
  {
    slug: "n5-ni-location",
    title: "〜に (existence)",
    structure: "place + に + あります／います",
    meaning: { en: "marks where something exists", de: "markiert, wo etwas ist" },
    explanation: {
      en: "に marks the place where something is, used with あります (for things) or います (for living beings).",
      de: "に markiert den Ort, an dem sich etwas befindet — zusammen mit あります (Dinge) oder います (Lebewesen).",
    },
    examples: [
      { japanese: "机の上に本があります。", en: "There is a book on the desk.", de: "Auf dem Tisch liegt ein Buch." },
      { japanese: "部屋に猫がいます。", en: "There is a cat in the room.", de: "Im Zimmer ist eine Katze." },
    ],
  },
  {
    slug: "n5-de-place",
    title: "〜で (place of action)",
    structure: "place + で + verb",
    meaning: { en: "marks where an action happens", de: "markiert, wo eine Handlung geschieht" },
    explanation: {
      en: "で marks the place where an action takes place — contrast with に, which marks where something merely exists.",
      de: "で markiert den Ort, an dem eine Handlung stattfindet — im Gegensatz zu に, das nur den Ort des Vorhandenseins markiert.",
    },
    examples: [
      { japanese: "学校で勉強します。", en: "I study at school.", de: "Ich lerne in der Schule." },
      { japanese: "家でテレビを見ます。", en: "I watch TV at home.", de: "Ich sehe zu Hause fern." },
    ],
  },
  {
    slug: "n5-e-direction",
    title: "〜へ／に (direction)",
    structure: "place + へ／に + motion verb",
    meaning: { en: "marks direction of movement", de: "markiert die Bewegungsrichtung" },
    explanation: {
      en: "へ (pronounced “e”) and に both mark the destination of a movement. へ stresses the direction, に the arrival point; at N5 they are interchangeable here.",
      de: "へ (ausgesprochen „e“) und に markieren beide das Ziel einer Bewegung. へ betont die Richtung, に den Ankunftsort; auf N5-Niveau sind sie hier austauschbar.",
    },
    examples: [
      { japanese: "日本へ行きます。", en: "I go to Japan.", de: "Ich fahre nach Japan." },
      { japanese: "家に帰ります。", en: "I go home.", de: "Ich gehe nach Hause." },
    ],
  },
  {
    slug: "n5-to-and",
    title: "〜と (and / with)",
    structure: "noun + と + noun",
    meaning: { en: "and / together with", de: "und / zusammen mit" },
    explanation: {
      en: "と joins nouns into a complete list (“A and B”), or marks the person you do something together with.",
      de: "と verbindet Nomen zu einer vollständigen Aufzählung („A und B“) oder markiert die Person, mit der man etwas gemeinsam tut.",
    },
    examples: [
      { japanese: "パンと卵を買います。", en: "I buy bread and eggs.", de: "Ich kaufe Brot und Eier." },
      { japanese: "友達と行きます。", en: "I go with a friend.", de: "Ich gehe mit einem Freund." },
    ],
  },
  {
    slug: "n5-masu",
    title: "〜ます",
    structure: "verb stem + ます",
    meaning: { en: "polite verb ending (non-past)", de: "höfliche Verbendung (nicht-Vergangenheit)" },
    explanation: {
      en: "ます attaches to the verb stem for a polite statement about the present or future. It's the form beginners use for everything.",
      de: "ます hängt an den Verbstamm und bildet eine höfliche Aussage über Gegenwart oder Zukunft. Es ist die Form, die Anfänger durchgehend verwenden.",
    },
    examples: [
      { japanese: "毎日日本語を勉強します。", en: "I study Japanese every day.", de: "Ich lerne jeden Tag Japanisch." },
      { japanese: "七時に起きます。", en: "I get up at seven.", de: "Ich stehe um sieben auf." },
    ],
  },
  {
    slug: "n5-masen",
    title: "〜ません",
    structure: "verb stem + ません",
    meaning: { en: "polite negative", de: "höfliche Verneinung" },
    explanation: {
      en: "ません is the polite negative of ます — “do not / will not do”.",
      de: "ません ist die höfliche Verneinung von ます — „nicht tun / nicht tun werden“.",
    },
    examples: [
      { japanese: "お酒を飲みません。", en: "I don't drink alcohol.", de: "Ich trinke keinen Alkohol." },
      { japanese: "肉を食べません。", en: "I don't eat meat.", de: "Ich esse kein Fleisch." },
    ],
  },
  {
    slug: "n5-mashita",
    title: "〜ました",
    structure: "verb stem + ました",
    meaning: { en: "polite past", de: "höfliche Vergangenheit" },
    explanation: {
      en: "ました is the polite past of ます — “did” an action.",
      de: "ました ist die höfliche Vergangenheitsform von ます — eine Handlung, die „getan wurde“.",
    },
    examples: [
      { japanese: "昨日映画を見ました。", en: "I watched a movie yesterday.", de: "Ich habe gestern einen Film gesehen." },
      { japanese: "手紙を書きました。", en: "I wrote a letter.", de: "Ich habe einen Brief geschrieben." },
    ],
  },
  {
    slug: "n5-te-form",
    title: "〜てください",
    structure: "verb て-form + ください",
    meaning: { en: "please do …", de: "bitte … tun" },
    explanation: {
      en: "The て-form of a verb plus ください makes a polite request — “please do …”.",
      de: "Die て-Form eines Verbs plus ください bildet eine höfliche Bitte — „bitte … tun“.",
    },
    examples: [
      { japanese: "ちょっと待ってください。", en: "Please wait a moment.", de: "Bitte warte einen Moment." },
      { japanese: "ここに名前を書いてください。", en: "Please write your name here.", de: "Bitte schreibe hier deinen Namen." },
    ],
  },
  {
    slug: "n5-te-iru",
    title: "〜ています",
    structure: "verb て-form + います",
    meaning: { en: "is …-ing (ongoing action or state)", de: "ist gerade am … (laufende Handlung oder Zustand)" },
    explanation: {
      en: "The て-form plus います describes an action in progress right now, or an ongoing state.",
      de: "Die て-Form plus います beschreibt eine gerade ablaufende Handlung oder einen andauernden Zustand.",
    },
    examples: [
      { japanese: "今、本を読んでいます。", en: "I am reading a book now.", de: "Ich lese gerade ein Buch." },
      { japanese: "母は台所で料理をしています。", en: "Mom is cooking in the kitchen.", de: "Mama kocht in der Küche." },
    ],
  },
  {
    slug: "n5-i-adjective",
    title: "い-adjectives",
    structure: "い-adjective + noun",
    meaning: { en: "adjectives ending in い", de: "Adjektive auf い" },
    explanation: {
      en: "い-adjectives end in い and can sit directly before a noun, or at the end of a sentence with です.",
      de: "い-Adjektive enden auf い und stehen entweder direkt vor einem Nomen oder am Satzende mit です.",
    },
    examples: [
      { japanese: "高い山", en: "a high mountain", de: "ein hoher Berg" },
      { japanese: "この本は面白いです。", en: "This book is interesting.", de: "Dieses Buch ist interessant." },
    ],
  },
  {
    slug: "n5-na-adjective",
    title: "な-adjectives",
    structure: "な-adjective + な + noun",
    meaning: { en: "adjectives that take な", de: "Adjektive mit な" },
    explanation: {
      en: "な-adjectives need な before a noun they modify. At the end of a sentence they take です with no な.",
      de: "な-Adjektive brauchen ein な vor dem Nomen, das sie näher bestimmen. Am Satzende stehen sie mit です ohne な.",
    },
    examples: [
      { japanese: "きれいな花", en: "a pretty flower", de: "eine schöne Blume" },
      { japanese: "この町は静かです。", en: "This town is quiet.", de: "Diese Stadt ist ruhig." },
    ],
  },
  {
    slug: "n5-adjective-past",
    title: "〜かったです",
    structure: "い-adjective (drop い) + かったです",
    meaning: { en: "past tense of い-adjectives", de: "Vergangenheit der い-Adjektive" },
    explanation: {
      en: "To put an い-adjective in the past, drop the final い and add かった (plus です for politeness). です itself never becomes でした here.",
      de: "Um ein い-Adjektiv in die Vergangenheit zu setzen, lässt man das End-い weg und hängt かった an (plus です für Höflichkeit). です selbst wird hier nicht zu でした.",
    },
    examples: [
      { japanese: "映画は面白かったです。", en: "The movie was interesting.", de: "Der Film war interessant." },
      { japanese: "昨日は暑かったです。", en: "Yesterday was hot.", de: "Gestern war es heiß." },
    ],
  },
  {
    slug: "n5-tai",
    title: "〜たいです",
    structure: "verb stem + たいです",
    meaning: { en: "want to (do something)", de: "etwas tun wollen" },
    explanation: {
      en: "Attach たい to the verb stem to say you want to do something. たい itself conjugates like an い-adjective.",
      de: "Hänge たい an den Verbstamm, um zu sagen, dass du etwas tun möchtest. たい selbst wird wie ein い-Adjektiv gebeugt.",
    },
    examples: [
      { japanese: "水が飲みたいです。", en: "I want to drink water.", de: "Ich möchte Wasser trinken." },
      { japanese: "日本へ行きたいです。", en: "I want to go to Japan.", de: "Ich möchte nach Japan reisen." },
    ],
  },
  {
    slug: "n5-tara-dame",
    title: "〜てもいいです",
    structure: "verb て-form + もいいです",
    meaning: { en: "may / it's okay to", de: "dürfen / es ist in Ordnung" },
    explanation: {
      en: "The て-form plus もいいです gives permission — “you may …”. As a question (…もいいですか) it asks for permission.",
      de: "Die て-Form plus もいいです erteilt Erlaubnis — „du darfst …“. Als Frage (…もいいですか) bittet es um Erlaubnis.",
    },
    examples: [
      { japanese: "ここに座ってもいいですか。", en: "May I sit here?", de: "Darf ich mich hier hinsetzen?" },
      { japanese: "写真を撮ってもいいです。", en: "You may take photos.", de: "Du darfst Fotos machen." },
    ],
  },
  {
    slug: "n5-naide",
    title: "〜ないでください",
    structure: "verb ない-form + でください",
    meaning: { en: "please don't", de: "bitte nicht" },
    explanation: {
      en: "The ない-form plus でください is a polite negative request — “please don't …”.",
      de: "Die ない-Form plus でください ist eine höfliche verneinte Bitte — „bitte nicht …“.",
    },
    examples: [
      { japanese: "ここで写真を撮らないでください。", en: "Please don't take photos here.", de: "Bitte mache hier keine Fotos." },
      { japanese: "心配しないでください。", en: "Please don't worry.", de: "Bitte mach dir keine Sorgen." },
    ],
  },
  {
    slug: "n5-kara-because",
    title: "〜から (because)",
    structure: "reason + から",
    meaning: { en: "because / so", de: "weil / deshalb" },
    explanation: {
      en: "から after a clause gives the reason for what follows — “because [reason], [result]”.",
      de: "から nach einem Teilsatz gibt den Grund für das Folgende an — „weil [Grund], [Ergebnis]“.",
    },
    examples: [
      { japanese: "寒いから、窓を閉めます。", en: "Because it's cold, I'll close the window.", de: "Weil es kalt ist, schließe ich das Fenster." },
      { japanese: "時間がないから、急ぎます。", en: "Because there's no time, I'll hurry.", de: "Weil keine Zeit ist, beeile ich mich." },
    ],
  },
  {
    slug: "n5-ga-but",
    title: "〜が (but)",
    structure: "clause + が + clause",
    meaning: { en: "but / however", de: "aber / jedoch" },
    explanation: {
      en: "が between two clauses marks a contrast — “[clause], but [clause]”. This is different from the subject particle が.",
      de: "が zwischen zwei Teilsätzen markiert einen Gegensatz — „[Teilsatz], aber [Teilsatz]“. Das ist etwas anderes als die Subjektpartikel が.",
    },
    examples: [
      { japanese: "この店は安いですが、おいしくないです。", en: "This restaurant is cheap, but not tasty.", de: "Dieses Lokal ist billig, aber nicht lecker." },
      { japanese: "日本語は難しいですが、面白いです。", en: "Japanese is difficult, but interesting.", de: "Japanisch ist schwer, aber interessant." },
    ],
  },
  {
    slug: "n5-mae-ni",
    title: "〜まえに",
    structure: "verb (dictionary) / noun + の + まえに",
    meaning: { en: "before …", de: "vor …" },
    explanation: {
      en: "まえに means “before”. Use the dictionary form of a verb, or a noun plus の, in front of it.",
      de: "まえに bedeutet „vor“. Davor steht die Wörterbuchform eines Verbs oder ein Nomen plus の.",
    },
    examples: [
      { japanese: "寝るまえに、歯を磨きます。", en: "Before sleeping, I brush my teeth.", de: "Vor dem Schlafen putze ich mir die Zähne." },
      { japanese: "食事のまえに、手を洗います。", en: "Before the meal, I wash my hands.", de: "Vor dem Essen wasche ich mir die Hände." },
    ],
  },
  {
    slug: "n5-atode",
    title: "〜あとで",
    structure: "verb た-form / noun + の + あとで",
    meaning: { en: "after …", de: "nach …" },
    explanation: {
      en: "あとで means “after”. Use the past (た-form) of a verb, or a noun plus の, in front of it.",
      de: "あとで bedeutet „nach“. Davor steht die Vergangenheitsform (た-Form) eines Verbs oder ein Nomen plus の.",
    },
    examples: [
      { japanese: "仕事のあとで、映画を見ます。", en: "After work, I watch a movie.", de: "Nach der Arbeit sehe ich einen Film." },
      { japanese: "ご飯を食べたあとで、散歩します。", en: "After eating, I take a walk.", de: "Nach dem Essen mache ich einen Spaziergang." },
    ],
  },
];

export async function seedGrammarN5() {
  const bar = progress("Grammar N5");

  for (const [index, entry] of N5.entries()) {
    const data = {
      title: entry.title,
      structure: entry.structure,
      meaning: entry.meaning,
      explanation: entry.explanation,
      examples: entry.examples.map((ex) => ({
        japanese: ex.japanese,
        translations: { de: ex.de, en: ex.en },
      })),
      jlptLevel: "N5" as const,
      order: index,
    };

    await db.grammarPoint.upsert({
      where: { slug: entry.slug },
      // New points start unreviewed — hidden from learners until checked.
      create: { slug: entry.slug, reviewed: false, ...data },
      // On re-seed, refresh the text but never un-review a released point.
      update: data,
    });
    bar.tick();
  }

  const reviewed = await db.grammarPoint.count({ where: { reviewed: true } });
  bar.done();
  console.log(`    ${N5.length} points seeded, ${reviewed} marked reviewed`);
  console.log(
    "    all start reviewed:false — check them, then flip the flag to publish",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedGrammarN5()
    .catch((error) => {
      console.error("\nGrammar seed failed:", error);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
