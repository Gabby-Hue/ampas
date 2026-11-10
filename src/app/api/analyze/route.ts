import { NextResponse } from "next/server";

type AnalyzePayload = {
  test_version?: string;
  duration_seconds?: number;
  cpt?: { go_trials?: number; no_go_trials?: number; hit_rate?: number; omission_rate?: number; commission_rate?: number; median_rt_ms?: number | null; rt_variability_ms?: number | null };
  gaze?: { status?: "usable" | "limited" | "unavailable"; data_coverage?: number; relative_dispersion?: number };
};
type AnalysisResult = { source: string; is_diagnostic: false; attention_pattern: string; gaze_note: string; summary: string; suggestions: string[]; limitations: string[] };

function numberInRange(value: unknown, min = 0, max = 1): value is number { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max; }
function validate(payload: AnalyzePayload) {
  const cpt = payload.cpt;
  const gaze = payload.gaze;
  const gazeStatusValid = gaze?.status == null || ["usable", "limited", "unavailable"].includes(gaze.status);
  return !!cpt
    && numberInRange(cpt.hit_rate)
    && numberInRange(cpt.omission_rate)
    && numberInRange(cpt.commission_rate)
    && (cpt.go_trials == null || Number.isInteger(cpt.go_trials) && cpt.go_trials >= 0 && cpt.go_trials <= 1000)
    && (cpt.no_go_trials == null || Number.isInteger(cpt.no_go_trials) && cpt.no_go_trials >= 0 && cpt.no_go_trials <= 1000)
    && (cpt.median_rt_ms == null || numberInRange(cpt.median_rt_ms, 0, 10000))
    && (cpt.rt_variability_ms == null || numberInRange(cpt.rt_variability_ms, 0, 10000))
    && (payload.duration_seconds == null || numberInRange(payload.duration_seconds, 1, 600))
    && gazeStatusValid
    && (gaze?.data_coverage == null || numberInRange(gaze.data_coverage))
    && (gaze?.relative_dispersion == null || numberInRange(gaze.relative_dispersion, 0, 2));
}

function localAnalysis(payload: AnalyzePayload): AnalysisResult {
  const cpt = payload.cpt!;
  const flags = [cpt.omission_rate! >= 0.25, cpt.commission_rate! >= 0.25, cpt.hit_rate! < 0.65].filter(Boolean).length;
  const attentionPattern = flags === 0 ? "Performa respons pada sesi ini relatif konsisten." : flags === 1 ? "Sesi menunjukkan satu area performa yang layak diamati kembali." : "Sesi menunjukkan beberapa area performa yang layak dibahas lebih lanjut.";
  const gazeNote = payload.gaze?.status === "usable" ? "Indikator gaze tersedia dengan kualitas yang memadai untuk tampilan eksperimental." : "Indikator gaze tidak digunakan sebagai dasar interpretasi sesi ini.";
  return { source: "local-guardrail-v1", is_diagnostic: false, attention_pattern: attentionPattern, gaze_note: gazeNote, summary: "Hasil ini menggambarkan performa pada satu tugas singkat, bukan diagnosis. Jika kesulitan perhatian menetap dan mengganggu aktivitas, pertimbangkan berbicara dengan tenaga profesional.", suggestions: ["Ulangi pada waktu dan kondisi yang berbeda bila ingin membandingkan performa.", "Catat konteks tidur, stres, dan distraksi saat menginterpretasikan hasil."], limitations: ["Sesi singkat tidak menggantikan evaluasi klinis.", "Hasil dapat dipengaruhi perangkat, kondisi tubuh, dan lingkungan."] };
}

async function geminiAnalysis(payload: AnalyzePayload): Promise<AnalysisResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const schema = { type: "OBJECT", properties: { attention_pattern: { type: "STRING" }, gaze_note: { type: "STRING" }, summary: { type: "STRING" }, suggestions: { type: "ARRAY", items: { type: "STRING" } }, limitations: { type: "ARRAY", items: { type: "STRING" } } }, required: ["attention_pattern", "gaze_note", "summary", "suggestions", "limitations"] };
  const prompt = `You explain attention-task results in Indonesian. Never diagnose ADHD or any condition, never recommend medication, and state that this is not a clinical assessment. Return only JSON matching the schema. Metrics: ${JSON.stringify(payload)}`;
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 } }), signal: AbortSignal.timeout(4500) });
  if (!response.ok) return null;
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Omit<AnalysisResult, "source" | "is_diagnostic">;
    const validText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 1200;
    const validList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 6 && value.every((item) => validText(item));
    if (!validText(parsed.attention_pattern) || !validText(parsed.gaze_note) || !validText(parsed.summary) || !validList(parsed.suggestions) || !validList(parsed.limitations)) return null;
    const generatedText = [parsed.attention_pattern, parsed.gaze_note, parsed.summary, ...parsed.suggestions, ...parsed.limitations].join(" ");
    if (/\b(resep|dosis|minum obat|obat tertentu|medikasi)\b/i.test(generatedText)) return null;
    return { ...parsed, source: `gemini-${model}`, is_diagnostic: false };
  } catch { return null; }
}

export async function POST(request: Request) {
  let payload: AnalyzePayload;
  try { payload = await request.json() as AnalyzePayload; } catch { return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 }); }
  if (!validate(payload)) return NextResponse.json({ error: "Metrik CPT tidak lengkap atau di luar rentang." }, { status: 400 });
  try { const remote = await geminiAnalysis(payload); return NextResponse.json(remote ?? localAnalysis(payload)); } catch { return NextResponse.json(localAnalysis(payload)); }
}

