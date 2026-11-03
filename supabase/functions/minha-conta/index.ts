// POST /functions/v1/minha-conta  { action: "excluir", confirmacao: "EXCLUIR" }
// Direito de exclusão (LGPD): remove as conexões no agregador de Open Finance e
// depois apaga o usuário; o banco remove todos os dados em cascata.
import { adminClient, cors, json, pluggy, userFromRequest } from "../_shared/pluggy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await userFromRequest(req);
  if (!user) return json({ error: "Não autenticado" }, 401);

  const { action, confirmacao } = await req.json().catch(() => ({}));
  if (action !== "excluir") return json({ error: "Ação desconhecida" }, 400);
  if (confirmacao !== "EXCLUIR") return json({ error: 'Digite EXCLUIR para confirmar.' }, 422);

  const db = adminClient();
  const { data: conexoes } = await db.from("of_conexoes").select("external_item_id").eq("user_id", user.id);
  const falhas: string[] = [];
  for (const c of conexoes ?? []) {
    try { await pluggy(`/items/${c.external_item_id}`, { method: "DELETE" }); }
    catch (e) { falhas.push(c.external_item_id); console.error("Falha ao remover item", c.external_item_id, e); }
  }
  // Sem remover o consentimento no agregador, não apagamos a conta: o compartilhamento continuaria ativo.
  if (falhas.length) return json({ error: "Não foi possível encerrar a conexão com um dos bancos. Tente de novo em alguns minutos." }, 502);

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "Não foi possível excluir a conta." }, 500);
  return json({ ok: true });
});
