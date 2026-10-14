import { companyProfile } from "../src/domain/company.js";
import type { StoredProposal } from "../src/domain/proposal.js";
import { renderErrorHtml, renderNotFoundHtml, renderProposalHtml } from "../src/proposal/render.js";
import { getProposal } from "../src/storage/repository.js";

const HTML_HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Robots-Tag": "noindex",
  "Cache-Control": "no-store",
};

function htmlResponse(html: string, status: number): Response {
  return new Response(html, { status, headers: HTML_HEADERS });
}

function resolveLogoUrl(logo: string | null, requestUrl: string): string | null {
  if (!logo) {
    return null;
  }
  return logo.startsWith("/") ? new URL(logo, requestUrl).href : logo;
}

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return htmlResponse(renderNotFoundHtml(), 404);
  }
  let proposal: StoredProposal | null;
  try {
    proposal = await getProposal(id);
  } catch (error: unknown) {
    console.error("Failed to load proposal", error);
    return htmlResponse(renderErrorHtml(), 500);
  }
  if (!proposal) {
    return htmlResponse(renderNotFoundHtml(), 404);
  }
  const logoUrl = resolveLogoUrl(companyProfile.logo, request.url);
  return htmlResponse(renderProposalHtml(proposal, companyProfile, logoUrl), 200);
}
