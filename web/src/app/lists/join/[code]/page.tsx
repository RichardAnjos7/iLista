import { JoinListClient } from "./JoinListClient";

type PageProps = { params: Promise<{ code: string }> };

export default async function JoinListPage({ params }: PageProps) {
  const { code } = await params;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-slate-950">
      <JoinListClient code={code} />
    </div>
  );
}
