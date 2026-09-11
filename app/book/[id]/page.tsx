import { redirect } from "next/navigation";

export default async function BookAliasPage({ params }: PageProps<"/book/[id]">) {
  const { id } = await params;
  redirect(`/performers/${id}/book`);
}
