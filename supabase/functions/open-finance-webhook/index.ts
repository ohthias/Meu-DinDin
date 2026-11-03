// Webhook da Pluggy: re-sincroniza quando um Item é atualizado em segundo plano.
// Deploy com --no-verify-jwt. Protegido por um segredo na query string (?secret=...).
import { adminClient, json, removerConexao, sincronizarItem } from "../_shared/pluggy.ts";

const EVENTOS_SYNC = new Set(["item/created", "item/updated", "transactions/created", "transactions/updated"]);

Deno.serve(async (req) => {
  const secret = Deno.env.get("PLUGGY_WEBHOOK_SECRET");
  if (secret && new URL(req.url).searchParams.get("secret") !== secret) return json({ error: "Proibido" }, 403);

  const evt = await req.json().catch(() => null);
  if (!evt?.itemId) return json({ ok: true });

  const db = adminClient();
  const { data: conexao } = await db.from("of_conexoes")
    .select("user_id").eq("external_item_id", evt.itemId).maybeSingle();
  if (!conexao) return json({ ok: true, ignorado: "item desconhecido" });

  if (evt.event === "item/deleted") {
    await removerConexao(evt.itemId, conexao.user_id);
  } else if (evt.event === "item/error" || evt.event === "item/login_succeeded" || evt.event === "item/waiting_user_input") {
    await db.from("of_conexoes").update({ status: evt.event === "item/error" ? "LOGIN_ERROR" : "UPDATING" })
      .eq("external_item_id", evt.itemId);
  } else if (EVENTOS_SYNC.has(evt.event)) {
    // Responde rápido e sincroniza em segundo plano
    // @ts-ignore EdgeRuntime existe no runtime do Supabase
    EdgeRuntime.waitUntil(sincronizarItem(evt.itemId, conexao.user_id).catch(console.error));
  }
  return json({ ok: true });
});
