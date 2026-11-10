import { ChannelSettings } from "../channel-settings";

export default async function MensagensPage(props: PageProps<"/admin/marketing/mensagens">) {
  const { editar, nova } = await props.searchParams;
  return (
    <ChannelSettings
      channel="mensagem"
      editId={typeof editar === "string" ? editar : undefined}
      creating={nova === "1"}
    />
  );
}
