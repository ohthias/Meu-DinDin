// POST /functions/v1/open-finance
// { action: "connect-token", itemId? }  → token para abrir o widget Pluggy Connect
// { action: "sync", itemId }            → importa contas e transações do Item
// { action: "disconnect", itemId }      → remove o Item na Pluggy e os dados locais
import { adminClient, cors, exigirTermos, json, pluggy, regra, RegraViolada, removerConexao, sincronizarItem, userFromRequest } from "../_shared/pluggy.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const user = await userFromRequest(req);
  if (!user) return json({ error: "Não autenticado" }, 401);

  try {
    const { action, itemId } = await req.json();

    if (action === "connect-token") {
      await exigirTermos(user.id);
      if (!itemId) {
        const { count } = await adminClient().from("of_conexoes").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        const maximo = await regra("max_conexoes_bancarias");
        if ((count ?? 0) >= maximo) throw new RegraViolada(`Você já conectou ${maximo} bancos, o máximo permitido. Desconecte um para adicionar outro.`);
      }
      const webhookUrl = Deno.env.get("PLUGGY_WEBHOOK_URL");
      const body: Record<string, unknown> = {
        options: {
          clientUserId: user.id,
          avoidDuplicates: true,
          ...(webhookUrl ? { webhookUrl } : {}),
        },
      };
      if (itemId) body.itemId = itemId; // reconexão / atualização de credenciais
      const { accessToken } = await pluggy<{ accessToken: string }>("/connect_token", {
        method: "POST",
        body: JSON.stringify(body),
      });
      return json({ accessToken });
    }

    if (!itemId || typeof itemId !== "string") return json({ error: "itemId obrigatório" }, 400);

    // Para ações sobre um Item existente, confirma que é do usuário
    const db = adminClient();
    const { data: existente } = await db.from("of_conexoes")
      .select("user_id").eq("external_item_id", itemId).maybeSingle();
    if (existente && existente.user_id !== user.id) return json({ error: "Proibido" }, 403);

    if (action === "sync") {
      await exigirTermos(user.id);
      // evita sincronizações em sequência (cada uma consulta o banco da pessoa)
      const { data: atual } = await db.from("of_conexoes").select("ultima_sync").eq("external_item_id", itemId).maybeSingle();
      const intervalo = (await regra("minutos_entre_sincronizacoes")) * 60_000;
      if (atual?.ultima_sync && Date.now() - new Date(atual.ultima_sync).getTime() < intervalo) {
        throw new RegraViolada("Este banco acabou de ser atualizado. Tente de novo em alguns minutos.", 429);
      }
      const r = await sincronizarItem(itemId, user.id);
      return json({ ok: true, contas: r.contas, transacoes: r.transacoes, status: r.conexao.status });
    }

    if (action === "disconnect") {
      await pluggy(`/items/${itemId}`, { method: "DELETE" }).catch(() => null);
      await removerConexao(itemId, user.id);
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    if (e instanceof RegraViolada) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
