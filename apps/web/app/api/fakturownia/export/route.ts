import { getActiveMembership } from "@e-logistic/api";
import { toFakturowniaInvoice } from "@e-logistic/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ invoiceId: z.string().uuid() });

/**
 * Eksport faktury do Fakturowni (legalna faktura VAT + numeracja). Token i subdomena
 * wyłącznie po stronie serwera (FAKTUROWNIA_API_TOKEN / FAKTUROWNIA_DOMAIN).
 * Autoryzacja: sesja + owner/dispatcher; faktura musi należeć do firmy (RLS).
 * Zwraca link do publicznego PDF (token udostępniania — bez ujawniania api_token).
 */
export async function POST(request: Request) {
  const token = process.env.FAKTUROWNIA_API_TOKEN;
  const domain = process.env.FAKTUROWNIA_DOMAIN;
  if (!token || !domain) {
    return NextResponse.json(
      {
        error:
          "Integracja z Fakturownią niezaskonfigurowana (ustaw FAKTUROWNIA_API_TOKEN i FAKTUROWNIA_DOMAIN).",
      },
      { status: 501 },
    );
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Brak sesji." }, { status: 401 });

  const m = await getActiveMembership(supabase).catch(() => null);
  if (!m || (m.role !== "owner" && m.role !== "dispatcher")) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  const parsed = schema.safeParse((await request.json().catch(() => ({}))) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });

  // RLS ogranicza odczyt do faktur własnej firmy.
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "id, company_id, issue_date, due_date, currency, seller_name, seller_tax_id, seller_bank, seller_account, buyer_name, buyer_tax_id, buyer_address, description, net, vat_rate, vat_amount, gross",
    )
    .eq("id", parsed.data.invoiceId)
    .maybeSingle();
  if (!inv || inv.company_id !== m.companyId) {
    return NextResponse.json({ error: "Faktura nie istnieje." }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("description, quantity, gross, vat_rate")
    .eq("invoice_id", inv.id)
    .order("position");

  const invoice = toFakturowniaInvoice({
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    currency: inv.currency,
    seller: {
      name: inv.seller_name,
      taxId: inv.seller_tax_id,
      bank: inv.seller_bank,
      account: inv.seller_account,
    },
    buyer: { name: inv.buyer_name, taxId: inv.buyer_tax_id, address: inv.buyer_address },
    items: (items ?? []).map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      gross: Number(it.gross),
      vatRate: Number(it.vat_rate),
    })),
    fallback: {
      description: inv.description ?? "Usługa transportowa",
      gross: inv.gross,
      vatRate: inv.vat_rate,
    },
  });

  const host = `https://${domain}.fakturownia.pl`;
  let res: Response;
  try {
    res = await fetch(`${host}/invoices.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_token: token, invoice }),
    });
  } catch {
    return NextResponse.json({ error: "Brak połączenia z Fakturownią." }, { status: 502 });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Fakturownia odrzuciła żądanie (${res.status}).`, detail: detail.slice(0, 500) },
      { status: 502 },
    );
  }
  const created = (await res.json().catch(() => ({}))) as {
    id?: number;
    number?: string;
    token?: string;
  };
  return NextResponse.json({
    id: created.id ?? null,
    number: created.number ?? null,
    // Publiczny PDF przez token udostępniania (nie ujawnia api_token).
    pdfUrl: created.token ? `${host}/invoice/${created.token}.pdf` : null,
  });
}
