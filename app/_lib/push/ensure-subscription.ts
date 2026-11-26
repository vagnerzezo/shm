// Inscrição do navegador para os avisos. Se o navegador já tem uma que o
// servidor não reconhece (apagada por 404/410 ou feita com outra chave), ela
// está morta: cancela e inscreve de novo, senão o cartão diria "ligado" e
// nada chegaria.

type BrowserSub = { endpoint: string; unsubscribe(): Promise<boolean> };
type Manager<S extends BrowserSub> = {
  getSubscription(): Promise<S | null>;
  subscribe(options: { userVisibleOnly: boolean; applicationServerKey: Uint8Array<ArrayBuffer> }): Promise<S>;
};

export async function ensureSubscription<S extends BrowserSub>(
  pm: Manager<S>,
  serverKnows: (endpoint: string) => Promise<boolean>,
  applicationServerKey: Uint8Array<ArrayBuffer>,
): Promise<S> {
  const existing = await pm.getSubscription();
  if (existing) {
    if (await serverKnows(existing.endpoint)) return existing;
    await existing.unsubscribe();
  }
  return pm.subscribe({ userVisibleOnly: true, applicationServerKey });
}
