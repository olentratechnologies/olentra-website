import { TranslationEditorPage } from "@/components/admin/operations-pages";

export default async function Page({ params }) {
  const { locale, contentId } = await params;
  return <TranslationEditorPage key={locale + "-" + contentId} locale={locale} contentId={contentId} />;
}
