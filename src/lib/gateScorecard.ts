import { GATE_PAPERS } from './branches'

export type GateFields = { name: string; ref: string; paper: string; score: number; year: number; air: number | null }

/**
 * Reads the fields printed on an official GATE scorecard (text extracted from the PDF). Returns null when the document
 * does not look like a scorecard. The placement cell still opens the PDF before the score counts.
 */
export function parseGateScorecard(text: string): GateFields | null {
  const t = text.replace(/\s+/g, ' ')
  if (!/GATE/i.test(t) || !/score/i.test(t)) return null
  const year = Number(t.match(/GATE\s*(20\d{2})/i)?.[1] ?? 0)
  const ref = (t.match(/Registration\s*(?:No\.?|Number|ID)\s*[:\-]?\s*([A-Z0-9]{8,20})/i)?.[1] ?? '').toUpperCase()
  const paper =
    t.match(/(?:Test\s*Paper|Paper)\s*(?:Code)?\s*[:\-]?\s*[A-Za-z &]*\(\s*([A-Z]{2})\s*\)/)?.[1] ??
    t.match(/\(\s*([A-Z]{2})\s*\)/g)?.map((m) => m.replace(/[()\s]/g, '')).find((c) => c in GATE_PAPERS) ??
    ''
  const score = Number(t.match(/GATE\s*Score\s*[:\-]?\s*(\d{1,4})/i)?.[1] ?? NaN)
  const air = Number(t.match(/All\s*India\s*Rank(?:\s*in\s*this\s*paper)?\s*[:\-]?\s*(\d{1,6})/i)?.[1] ?? NaN)
  const name = (t.match(/Name\s*(?:of\s*(?:the\s*)?Candidate)?\s*[:\-]\s*([A-Z][A-Z .'-]{2,80}?)(?=\s+(?:Parent|Father|Mother|Registration|Gender|Date|Test|Paper|$))/i)?.[1] ?? '').trim()
  if (!year || !paper || !Number.isFinite(score)) return null
  return { name, ref, paper, score, year, air: Number.isFinite(air) ? air : null }
}
