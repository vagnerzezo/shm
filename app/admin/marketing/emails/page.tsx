import { ChannelSettings } from "../channel-settings";

export default async function EmailsPage(props: PageProps<"/admin/marketing/emails">) {
  const { editar, nova } = await props.searchParams;
  return (
    <ChannelSettings channel="email" editId={typeof editar === "string" ? editar : undefined} creating={nova === "1"} />
  );
}
