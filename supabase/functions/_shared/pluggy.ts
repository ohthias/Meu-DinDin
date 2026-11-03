// Cliente mínimo da API Pluggy (agregador autorizado de Open Finance Brasil).
// CLIENT_ID / CLIENT_SECRET ficam só no servidor (secrets da Edge Function).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const BASE = Deno.env.get("PLUGGY_BASE_URL") ?? "https://api.pluggy.ai";
let cachedKey: { key: string; exp: number } | null = null;

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function apiKey(): Promise<string> {
  if (cachedKey && cachedKey.exp > Date.now()) return cachedKey.key;
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: Deno.env.get("PLUGGY_CLIENT_ID"),
      clientSecret: Deno.env.get("PLUGGY_CLIENT_SECRET"),
    }),
  });
  if (!res.ok) throw new Error(`Pluggy /auth falhou: ${res.status}`);
  const { apiKey } = await res.json();
  // A API key vale 2h; renovamos com folga.
  cachedKey = { key: apiKey, exp: Date.now() + 100 * 60 * 1000 };
  return apiKey;
}

export async function pluggy<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-KEY": await apiKey(), ...init.headers },
  });
  if (!res.ok) throw new Error(`Pluggy ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Tipos usados da API ─────────────────────────────────────────────────────
export interface PluggyItem {
  id: string;
  status: string;
  executionStatus?: string;
  clientUserId?: string;
  connector: { name: string; imageUrl?: string; primaryColor?: string };
  error?: { message?: string } | null;
}
interface PluggyAccount {
  id: string;
  type: "BANK" | "CREDIT" | string;
  subtype: string;
  name: string;
  marketingName?: string;
  number?: string;
  balance: number;
  currencyCode?: string;
  creditData?: { creditLimit?: number } | null;
}
interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw?: string;
  amount: number;
  date: string;
  type: "DEBIT" | "CREDIT";
  category?: string | null;
  paymentData?: { paymentMethod?: string } | null;
}
interface Page<T> { results: T[]; page?: number; totalPages?: number }

// ── Supabase ────────────────────────────────────────────────────────────────
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/** Valida o JWT do usuário que chamou a função. */
export async function userFromRequest(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await adminClient().auth.getUser(token);
  return data.user ?? null;
}

// ── Mapeamentos para o modelo do Meu DinDin ─────────────────────────────────
function tipoConta(a: PluggyAccount) {
  if (a.type === "CREDIT") return "cartao";
  if (a.subtype === "SAVINGS_ACCOUNT") return "poupanca";
  if (a.subtype === "CHECKING_ACCOUNT") return "corrente";
  return "outro";
}

// Categorias Pluggy (inglês) → categorias do app
const CATEGORIAS: [RegExp, string][] = [
  [/salary|income|wage/i, "Salário"],
  [/investment|interest|dividend/i, "Investimentos"],
  [/food|restaurant|grocer|supermarket|delivery|eating/i, "Alimentação"],
  [/transport|taxi|ride|gas station|fuel|parking|public transport|airport|flight/i, "Transporte"],
  [/health|pharmac|drug|hospital|dental|gym|fitness/i, "Saúde"],
  [/rent|housing|electricity|water|utilit|internet|telecom|home/i, "Moradia"],
  [/education|school|course|book/i, "Educação"],
  [/clothing|apparel|fashion/i, "Roupas"],
  [/streaming|digital service|video|music|subscription/i, "Streaming"],
  [/leisure|entertainment|travel|game|bar|night|ticket|culture|sport/i, "Lazer"],
];
function categoria(t: PluggyTransaction) {
  const c = t.category ?? "";
  for (const [re, nome] of CATEGORIAS) if (re.test(c)) return nome;
  return "Outro";
}

function formaPagamento(t: PluggyTransaction, tipoConta: string) {
  if (tipoConta === "cartao") return "Crédito";
  const m = t.paymentData?.paymentMethod ?? "";
  if (/PIX/i.test(m) || /\bpix\b/i.test(t.description)) return "Pix";
  if (/BOLETO/i.test(m)) return "Boleto";
  if (/TED|DOC/i.test(m)) return "Transferência";
  return "Débito";
}

/**
 * Busca o Item, contas e transações (últimos `dias`) na Pluggy e faz upsert no Supabase.
 * Idempotente: usa os IDs externos como chave única.
 */
export async function sincronizarItem(itemId: string, userId: string, dias = 90) {
  const db = adminClient();
  const item = await pluggy<PluggyItem>(`/items/${itemId}`);

  // Garante que o Item pertence a este usuário (clientUserId gravado no connect token)
  if (item.clientUserId && item.clientUserId !== userId) throw new Error("Item não pertence ao usuário");

  const { data: conexao, error: e1 } = await db.from("of_conexoes").upsert({
    user_id: userId,
    external_item_id: item.id,
    instituicao: item.connector.name,
    instituicao_logo: item.connector.imageUrl ?? null,
    instituicao_cor: item.connector.primaryColor ? `#${item.connector.primaryColor.replace("#", "")}` : null,
    status: item.status,
    status_detalhe: item.error?.message ?? item.executionStatus ?? null,
    ultima_sync: new Date().toISOString(),
  }, { onConflict: "external_item_id" }).select().single();
  if (e1) throw e1;

  if (item.status !== "UPDATED" && item.status !== "OUTDATED") return { conexao, contas: 0, transacoes: 0 };

  const { results: accounts } = await pluggy<Page<PluggyAccount>>(`/accounts?itemId=${item.id}`);
  const from = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
  let totalTx = 0;

  for (const a of accounts) {
    const tipo = tipoConta(a);
    const { data: conta, error: e2 } = await db.from("contas").upsert({
      user_id: userId,
      conexao_id: conexao.id,
      external_account_id: a.id,
      origem: "open_finance",
      nome: a.marketingName || a.name,
      tipo,
      instituicao: item.connector.name,
      numero: a.number ?? null,
      // Em cartão a Pluggy devolve o saldo devedor como positivo
      saldo: a.balance,
      limite_credito: a.creditData?.creditLimit ?? null,
      moeda: a.currencyCode ?? "BRL",
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "external_account_id" }).select().single();
    if (e2) throw e2;

    let page = 1, totalPages = 1;
    do {
      const res = await pluggy<Page<PluggyTransaction>>(
        `/transactions?accountId=${a.id}&from=${from}&pageSize=500&page=${page}`,
      );
      totalPages = res.totalPages ?? 1;
      const rows = res.results.map((t) => {
        const receita = t.type === "CREDIT";
        return {
          user_id: userId,
          conta_id: conta.id,
          external_id: t.id,
          origem: "open_finance",
          tipo: receita ? "receita" : "despesa",
          valor: Math.abs(t.amount),
          categoria: categoria(t),
          descricao: t.description || t.descriptionRaw || "",
          forma_pagamento: formaPagamento(t, tipo),
          data: t.date.slice(0, 10),
        };
      });
      if (rows.length) {
        const { error: e3 } = await db.from("transacoes").upsert(rows, { onConflict: "external_id" });
        if (e3) throw e3;
      }
      totalTx += rows.length;
      page++;
    } while (page <= totalPages);
  }

  return { conexao, contas: accounts.length, transacoes: totalTx };
}

/** Remove a conexão e tudo que veio dela (contas e transações importadas). */
export async function removerConexao(itemId: string, userId: string) {
  const db = adminClient();
  const { data: cx } = await db.from("of_conexoes").select("id")
    .eq("external_item_id", itemId).eq("user_id", userId).maybeSingle();
  if (!cx) return;
  const { data: contas } = await db.from("contas").select("id").eq("conexao_id", cx.id);
  const ids = (contas ?? []).map((c) => c.id);
  if (ids.length) await db.from("transacoes").delete().in("conta_id", ids).eq("origem", "open_finance");
  await db.from("of_conexoes").delete().eq("id", cx.id);
}

// ── Regras de negócio (valores em public.config_regras) ─────────────────────
export class RegraViolada extends Error {
  constructor(mensagem: string, public status = 422) { super(mensagem) }
}

export async function regra(chave: string): Promise<number> {
  const { data } = await adminClient().from("config_regras").select("valor").eq("chave", chave).single();
  return Number(data?.valor);
}

/** Só quem aceitou a versão atual dos termos pode compartilhar dados bancários. */
export async function exigirTermos(userId: string) {
  const [{ data: perfil }, versao] = await Promise.all([
    adminClient().from("profiles").select("termos_versao").eq("id", userId).single(),
    regra("versao_termos"),
  ]);
  if (!perfil?.termos_versao || perfil.termos_versao < versao) {
    throw new RegraViolada("Aceite os termos de uso para conectar um banco.", 403);
  }
}
