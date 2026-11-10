import { NextResponse } from "next/server";

type AnalyzePayload = {
  test_version?: string;
  duration_seconds?: number;
  asrs?: {
    total_score?: number;
    significant_items?: number;
    is_significant?: boolean;
  };
  cpt?: { go_trials?: number; no_go_trials?: number; hit_rate?: number; omission_rate?: number; commission_rate?: number; median_rt_ms?: number | null; rt_variability_ms?: number | null };
  gaze?: { status?: "usable" | "limited" | "unavailable"; data_coverage?: number; relative_dispersion?: number };
};
type AnalysisResult = {
  source: string;
  is_diagnostic: false;
  layperson_insight: {
    stamina_headline: string;
    stamina_description: string;
    reaction_style_headline: string;
    reaction_style_description: string;
    actionable_habits: string[];
  };
  clinical_referral: {
    diagnostic_impression: string;
    asrs_clinical_correlation: string;
    cpt_psychometric_note: string;
    gaze_stability_note: string;
    provisional_recommendations: string[];
    formal_limitations: string[];
  };
};

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
  const asrs = payload.asrs;
  const isHighOmission = (cpt.omission_rate ?? 0) >= 0.20;
  const isHighCommission = (cpt.commission_rate ?? 0) >= 0.25;
  const isSlowRt = (cpt.median_rt_ms ?? 0) > 480;

  // Layperson Copywriting
  let styleHeadline = "Pola respons terukur dan seimbang";
  let styleDesc = "Kamu mampu menyeimbangkan kecepatan menekan target hijau dengan ketenangan menahan diri saat target merah muncul.";
  if (isHighCommission && !isHighOmission) {
    styleHeadline = "Tipe Refleks Cepat (Kecenderungan Terburu-buru)";
    styleDesc = "Jarimu bergerak sangat tanggap, namun kamu rentan salah pencet saat melihat warna merah. Ini ciri khas refleks motorik yang mendahului evaluasi sadar.";
  } else if (isHighOmission && !isHighCommission) {
    styleHeadline = "Tipe Rentan Melamun (Kelengahan Sesaat)";
    styleDesc = "Kamu jarang salah menekan target merah, namun ada beberapa target hijau yang terlewat tanpa disadari saat perhatianmu melayang.";
  } else if (isHighOmission && isHighCommission) {
    styleHeadline = "Kelelahan Fokus Menyeluruh (Brain Fog)";
    styleDesc = "Terlihat fluktuasi ganda di mana target hijau terlewat sekaligus target merah keliru ditekan, menandakan beban kognitif atau kurang tidur.";
  }

  const habits: string[] = [];
  if (isHighCommission) habits.push("Terapkan 'jeda 2 detik' sebelum membuka notifikasi ponsel atau membalas pesan terburu-buru.");
  if (isHighOmission || isSlowRt) habits.push("Bagi tugas berat ke dalam sesi fokus pendek 20 menit (Teknik Pomodoro) dengan jeda berdiri 3 menit.");
  habits.push("Kurangi konsumsi konten video cepat di bawah 60 detik menjelang waktu tidur.");

  // Clinical Referral Copywriting
  const asrsSummary = asrs
    ? `Hasil kuesioner WHO ASRS v1.1 Part A menunjukkan skor ${asrs.total_score ?? 0}/24 (${asrs.significant_items ?? 0}/6 item melewati ambang batas keparahan; ${asrs.is_significant ? "Signifikan secara klinis" : "Dalam batas wajar"}).`
    : "Data keluhan kronis ASRS v1.1 tidak disertakan pada sesi ini.";

  const cptNote = `Objektifikasi CPT Go/No-Go menunjukkan Hit Rate ${Math.round((cpt.hit_rate ?? 0) * 100)}%, Omission Rate ${Math.round((cpt.omission_rate ?? 0) * 100)}%, Commission Rate ${Math.round((cpt.commission_rate ?? 0) * 100)}%, Median RT ${cpt.median_rt_ms ?? 0} ms, RTV ${cpt.rt_variability_ms ?? 0} ms.`;

  const gazeNote = payload.gaze?.status === "usable"
    ? `Pemantauan stabilitas fiksasi okulomotorik (Webcam Gaze On-Device) mencatat coverage ${Math.round((payload.gaze.data_coverage ?? 0) * 100)}% dengan dispersi relatif ${payload.gaze.relative_dispersion?.toFixed(3) ?? "0"}.`
    : "Sensor gaze tidak aktif atau coverage sub-optimal; analisis okulomotor diabaikan.";

  return {
    source: "local-dual-tone-guardrail-v2",
    is_diagnostic: false,
    layperson_insight: {
      stamina_headline: "Stamina atensi tugas 60 detik",
      stamina_description: "Gambaran ini memperlihatkan bagaimana otakmu menjaga ketepatan waktu reaksi dan menahan refleks tergesa-gesa.",
      reaction_style_headline: styleHeadline,
      reaction_style_description: styleDesc,
      actionable_habits: habits,
    },
    clinical_referral: {
      diagnostic_impression: "Screening ini merupakan instrumen triase performa atensi neurobehavioral awal dan BUKAN instrumen penentu diagnosis klinis mandiri (non-DSM-5 definitive diagnostic).",
      asrs_clinical_correlation: asrsSummary,
      cpt_psychometric_note: cptNote,
      gaze_stability_note: gazeNote,
      provisional_recommendations: [
        "Direkomendasikan evaluasi psikometri lanjutan (Conners CPT 3 komprehensif atau CAARS) bila keluhan atensi menimbulkan hendaya fungsional.",
        "Pertimbangkan evaluasi diferensial terhadap faktor komorbid (gangguan afektif, ansietas, atau sleep hygiene).",
      ],
      formal_limitations: [
        "Durasi penapisan peramban singkat tidak mengisolasi faktor kelelahan akut situasional.",
        "Metrik okulomotorik MediaPipe merupakan aproksimasi teknis dan tidak setara perangkat eye-tracking inframerah laboratorium.",
      ],
    },
  };
}

async function geminiAnalysis(payload: AnalyzePayload): Promise<AnalysisResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  
  const schema = {
    type: "OBJECT",
    properties: {
      layperson_insight: {
        type: "OBJECT",
        properties: {
          stamina_headline: { type: "STRING" },
          stamina_description: { type: "STRING" },
          reaction_style_headline: { type: "STRING" },
          reaction_style_description: { type: "STRING" },
          actionable_habits: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["stamina_headline", "stamina_description", "reaction_style_headline", "reaction_style_description", "actionable_habits"],
      },
      clinical_referral: {
        type: "OBJECT",
        properties: {
          diagnostic_impression: { type: "STRING" },
          asrs_clinical_correlation: { type: "STRING" },
          cpt_psychometric_note: { type: "STRING" },
          gaze_stability_note: { type: "STRING" },
          provisional_recommendations: { type: "ARRAY", items: { type: "STRING" } },
          formal_limitations: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["diagnostic_impression", "asrs_clinical_correlation", "cpt_psychometric_note", "gaze_stability_note", "provisional_recommendations", "formal_limitations"],
      },
    },
    required: ["layperson_insight", "clinical_referral"],
  };

  const prompt = `You are a medical intelligence assistant analyzing attention performance data for OculiCare NeuroFocus.
You MUST generate two distinct copywriting versions:
1. "layperson_insight": friendly, non-medical, encouraging, easy-to-understand Indonesian for general users. Explain focus stamina, distraction tendencies (e.g. impulsive tapping vs daydreaming), and 3 practical daily habits.
2. "clinical_referral": formal, professional clinical psychiatric/psychological Indonesian phrasing for doctors/psychologists reviewing this referral sheet. State metrics objectively, reference WHO ASRS and CPT indices, and emphasize that this is a non-diagnostic early screening.
Never prescribe drugs or dosage. Return pure JSON matching the schema.
Input Payload: ${JSON.stringify(payload)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(4500),
  });

  if (!response.ok) return null;
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Omit<AnalysisResult, "source" | "is_diagnostic">;
    return { ...parsed, source: `gemini-${model}`, is_diagnostic: false };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let payload: AnalyzePayload;
  try {
    payload = await request.json() as AnalyzePayload;
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (!validate(payload)) {
    return NextResponse.json({ error: "Metrik CPT tidak lengkap atau di luar rentang." }, { status: 400 });
  }

  try {
    const remote = await geminiAnalysis(payload);
    return NextResponse.json(remote ?? localAnalysis(payload));
  } catch {
    return NextResponse.json(localAnalysis(payload));
  }
}

