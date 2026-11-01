export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  if (response.status === 401) {
    window.dispatchEvent(new Event("airsul:session-expired"));
    throw new Error("Sua sessão expirou. Entre novamente.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || (response.status === 429 ? "Muitas tentativas. Aguarde um pouco e tente novamente." : "Não foi possível concluir. Tente novamente."));
  }
  return response.json();
}
export const jsonBody = (method: string, data: unknown): RequestInit => ({method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)});
