import { NextResponse } from "next/server";
import { getPretrainedModel, predictAdhdRisk } from "@/lib/ml/classifier";
import type { FeatureVector } from "@/lib/ml/synthetic";

type AnalyzeBlock = {
  label?: string;
  phase?: string;
  hit_rate?: number;
  commission_rate?: number;
  median_rt_ms?: number | null;
};

type AnalyzePayload = {
  test_version?: string;
  test_mode?: "clinical" | "quick" | "synthetic";
  duration_seconds?: number;
  tab_interruptions?: number;
  subject_context?: {
    sleepHours?: string;
    caffeineRecent?: boolean;
    screenTimeHours?: string;
    timeOfDay?: string;
  };
  asrs?: {
    total_score?: number;
    significant_items?: number;
    is_significant?: boolean;
  };
  cpt?: {
    go_trials?: number;
    no_go_trials?: number;
    hit_rate?: number;
    omission_rate?: number;
    commission_rate?: number;
    median_rt_ms?: number | null;
    rt_variability_ms?: number | null;
    d_prime?: number | null;
    anticipatory_responses?: number;
    attention_lapses?: number;
    fatigue_slope?: number | null;
    rt_slope_ms_per_block?: number | null;
  };
  blocks?: AnalyzeBlock[];
  gaze?: {
    status?: "usable" | "limited" | "unavailable";
    data_coverage?: number;
    relative_dispersion?: number;
    out_of_bounds_rate?: number;
    mean_gdi?: number;
    max_gdi?: number;
    trials_with_gaze_data?: number;
  };
  trailing?: {
    accuracy_percent?: number;
    mean_deviation?: number;
    intrusive_saccades?: number;
    status?: string;
  };
  ex_gaussian?: {
    mu_ms?: number | null;
    sigma_ms?: number | null;
    tau_ms?: number | null;
  };
};

type AnalysisResult = {
  source: string;
  is_diagnostic: false;
  ml_prediction?: {
    model_version: string;
    adhd_probability: number;
    classification: "adhd" | "nt";
    confidence: number;
    trained_on: string;
    accuracy: number;
  };
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

function numberInRange(value: unknown, min = 0, max = 1): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function validate(payload: AnalyzePayload) {
  const cpt = payload.cpt;
  const gaze = payload.gaze;
  const gazeStatusValid = gaze?.status == null || ["usable", "limited", "unavailable"].includes(gaze.status);
  return (
    !!cpt &&
    numberInRange(cpt.hit_rate) &&
    numberInRange(cpt.omission_rate) &&
    numberInRange(cpt.commission_rate) &&
    (cpt.go_trials == null || (Number.isInteger(cpt.go_trials) && cpt.go_trials >= 0 && cpt.go_trials <= 1000)) &&
    (cpt.no_go_trials == null || (Number.isInteger(cpt.no_go_trials) && cpt.no_go_trials >= 0 && cpt.no_go_trials <= 1000)) &&
    (cpt.median_rt_ms == null || numberInRange(cpt.median_rt_ms, 0, 10000)) &&
    (cpt.rt_variability_ms == null || numberInRange(cpt.rt_variability_ms, 0, 10000)) &&
    (payload.duration_seconds == null || numberInRange(payload.duration_seconds, 1, 1200)) &&
    gazeStatusValid &&
    (gaze?.data_coverage == null || numberInRange(gaze.data_coverage)) &&
    (gaze?.relative_dispersion == null || numberInRange(gaze.relative_dispersion, 0, 2))
  );
}

function computeMlPrediction(payload: AnalyzePayload) {
  const cpt = payload.cpt;
  if (!cpt) return undefined;
  const mlFeatureVector: FeatureVector = {
    commission_rate: cpt.commission_rate ?? 0,
    omission_rate: cpt.omission_rate ?? 0,
    median_rt_ms: cpt.median_rt_ms ?? 440,
    rt_variability_ms: cpt.rt_variability_ms ?? 60,
    d_prime: cpt.d_prime ?? 2.0,
    fatigue_slope: cpt.fatigue_slope ?? -0.02,
    tau_ms: payload.ex_gaussian?.tau_ms ?? null,
    asrs_score: payload.asrs?.total_score ?? 4,
  };

  const mlModel = getPretrainedModel();
  const mlPrediction = predictAdhdRisk(mlFeatureVector, mlModel);
  return {
    model_version: "logreg-synthetic-v1",
    adhd_probability: mlPrediction.probability,
    classification: mlPrediction.classification,
    confidence: mlPrediction.confidence,
    trained_on: "synthetic-distribution-adapted-from-Rojas-Libano-2019",
    accuracy: mlModel.accuracy,
  };
}

function localAnalysis(payload: AnalyzePayload): AnalysisResult {
  const cpt = payload.cpt!;
  const asrs = payload.asrs;
  const ctx = payload.subject_context;
  const durationMin = Math.max(1, Math.round((payload.duration_seconds ?? 360) / 60));

  const isHighOmission = (cpt.omission_rate ?? 0) >= 0.20;
  const isHighCommission = (cpt.commission_rate ?? 0) >= 0.25;
  const isSlowRt = (cpt.median_rt_ms ?? 0) > 480;
  const hasFatigueDrop = (cpt.fatigue_slope ?? 0) <= -0.05;
  const isSleepDeprived = ctx?.sleepHours === "<6";
  const dPrimeVal = cpt.d_prime ?? null;

  // Stamina headline based on duration & fatigue slope
  let staminaHeadline = `Ketahanan fokus sepanjang sesi ${durationMin} menit`;
  let staminaDesc =
    "Stamina perhatianmu cenderung konsisten dari awal hingga blok terakhir tanpa penurunan ketepatan yang tajam.";
  if (hasFatigueDrop) {
    staminaHeadline = `Penurunan stamina di paruh akhir (${durationMin} menit)`;
    staminaDesc =
      "Pada menit-menit awal fokusmu masih kuat, tetapi memasuki blok pertengahan hingga akhir mulai muncul kelelahan konsentrasi (vigilance decrement).";
  } else if (isSleepDeprived) {
    staminaHeadline = "Fokus terpengaruh kurang tidur (<6 jam)";
    staminaDesc =
      "Tidur di bawah 6 jam memperlambat pemrosesan sinyal otak dan membuat ketahanan fokus lebih cepat goyah saat tugas terasa monoton.";
  }

  // Reaction style
  let styleHeadline = "Pola respons terukur dan seimbang";
  let styleDesc =
    "Kamu mampu menyeimbangkan kecepatan menekan target hijau dengan ketenangan menahan diri saat target merah muncul.";
  if (isHighCommission && !isHighOmission) {
    styleHeadline = "Tipe Refleks Cepat (Kecenderungan Terburu-buru)";
    styleDesc =
      "Jarimu bergerak sangat tanggap, namun rentan salah tekan saat warna merah muncul mendadak, ciri refleks motorik yang mendahului evaluasi sadar.";
  } else if (isHighOmission && !isHighCommission) {
    styleHeadline = "Tipe Rentan Melamun (Kelengahan Sesaat)";
    styleDesc =
      "Kamu jarang salah menekan target merah, namun beberapa target hijau terlewat saat fokus mulai melayang di fase yang terasa membosankan.";
  } else if (isHighOmission && isHighCommission) {
    styleHeadline = "Kelelahan Fokus Menyeluruh (Cognitive Overload)";
    styleDesc =
      "Terjadi fluktuasi ganda: target hijau terlewat sekaligus target merah keliru ditekan. Pola ini sering muncul saat kelelahan mental, kurang tidur, atau kelebihan distraksi layar.";
  }

  const habits: string[] = [];
  if (isSleepDeprived) {
    habits.push("Prioritaskan pemulihan tidur minimal 7 jam malam ini sebelum mengulang tes pembanding di pagi hari.");
  }
  if (isHighCommission) {
    habits.push("Terapkan 'jeda 2 detik' sebelum membuka notifikasi ponsel atau mengetik balasan spontan.");
  }
  if (isHighOmission || hasFatigueDrop || isSlowRt) {
    habits.push("Gunakan sesi fokus terstruktur 25 menit dengan istirahat visual tanpa layar selama 5 menit.");
  }
  if (habits.length < 3) {
    habits.push("Batasi konsumsi konten video pendek (<60 detik) minimal 1 jam sebelum tidur untuk menjaga regulasi atensi.");
  }

  // Clinical Referral Copywriting
  const ctxSummary = ctx
    ? `Konteks fisiologis pra-tes: tidur ${ctx.sleepHours} jam, kafein ${ctx.caffeineRecent ? "ya (<2 jam)" : "tidak"}, paparan layar ${ctx.screenTimeHours} jam (${ctx.timeOfDay}).`
    : "Konteks fisiologis pra-tes tidak tercatat.";

  const asrsSummary = asrs
    ? `Skor WHO ASRS v1.1 Part A: ${asrs.total_score ?? 0}/24 (${asrs.significant_items ?? 0}/6 item di atas ambang keparahan; ${asrs.is_significant ? "Signifikan secara skrining" : "Di bawah ambang skrining"}). ${ctxSummary}`
    : `Data ASRS v1.1 tidak disertakan. ${ctxSummary}`;

  const dPrimeText = dPrimeVal !== null ? `d' (Signal Detectability): ${dPrimeVal}` : "d': N/A";
  const slopeText =
    cpt.fatigue_slope != null ? `Fatigue Slope: ${cpt.fatigue_slope}/blok` : "Fatigue Slope: N/A";
  const cptNote = `CPT Go/No-Go (${payload.test_mode ?? "clinical"}, ${payload.duration_seconds ?? 360}s): Hit Rate ${Math.round((cpt.hit_rate ?? 0) * 100)}%, Omission ${Math.round((cpt.omission_rate ?? 0) * 100)}%, Commission ${Math.round((cpt.commission_rate ?? 0) * 100)}%, Median RT ${cpt.median_rt_ms ?? 0} ms, RTV ${cpt.rt_variability_ms ?? 0} ms, ${dPrimeText}, ${slopeText}, Antisipasi (<120ms): ${cpt.anticipatory_responses ?? 0}, Lapses (>750ms): ${cpt.attention_lapses ?? 0}, Interupsi Tab: ${payload.tab_interruptions ?? 0}.`;

  const mlPrediction = computeMlPrediction(payload);

  // Incorporate GDI into gaze note
  const meanGdi = payload.gaze?.mean_gdi;
  const trialsWithGaze = payload.gaze?.trials_with_gaze_data ?? 0;
  const gdiInterpretation =
    meanGdi !== undefined && meanGdi > 0
      ? `Gaze Dispersion Index (rata-rata ${meanGdi.toFixed(3)} satuan layar) pada ${trialsWithGaze} trial dengan data tatapan.`
      : "";

  const trailingNote = payload.trailing?.status
    ? ` Uji penelusuran visual Trailing Eyes (smooth pursuit): akurasi ${payload.trailing.accuracy_percent ?? 0}%, deviasi RMS ${payload.trailing.mean_deviation ?? 0}, saccadic intrusions ${payload.trailing.intrusive_saccades ?? 0} kali (${payload.trailing.status}).`
    : "";

  const gazeNote =
    (payload.gaze?.status === "usable"
      ? `Pelacakan fiksasi MediaPipe On-Device mencatat coverage ${Math.round((payload.gaze.data_coverage ?? 0) * 100)}%, dispersi relatif ${payload.gaze.relative_dispersion?.toFixed(3) ?? "0"}, dan out-of-bounds rate ${Math.round((payload.gaze.out_of_bounds_rate ?? 0) * 100)}%.${gdiInterpretation}`
      : "Sensor okulomotorik tidak aktif atau coverage berada di bawah ambang kualitas; interpretasi difokuskan pada psikometri motorik CPT.") +
    trailingNote;

  const recs: string[] = [
    "Lakukan evaluasi diagnostik komprehensif (wawancara klinis terstruktur & Conners CPT 3 / T.O.V.A.) bila keluhan menimbulkan hendaya fungsional menetap.",
  ];
  if (isSleepDeprived) {
    recs.push("Perlu menyingkirkan faktor kelelahan akut akibat defisit tidur (<6 jam) dengan penjadwalan ulang skrining dalam kondisi cukup istirahat.");
  } else {
    recs.push("Pertimbangkan diagnosis banding terhadap gangguan afektif, kecemasan, atau beban stres kerja/akademik akut.");
  }

  return {
    source: "local-clinical-triangulation-v3",
    is_diagnostic: false,
    ml_prediction: mlPrediction,
    layperson_insight: {
      stamina_headline: staminaHeadline,
      stamina_description: staminaDesc,
      reaction_style_headline: styleHeadline,
      reaction_style_description: styleDesc,
      actionable_habits: habits.slice(0, 3),
    },
    clinical_referral: {
      diagnostic_impression:
        "Instrumen ini adalah penapisan awal performa atensi dan BUKAN alat diagnosis medis/DSM-5 mandiri. Hasil harus ditafsirkan bersama riwayat klinis oleh psikolog atau psikiater.",
      asrs_clinical_correlation: asrsSummary,
      cpt_psychometric_note: cptNote,
      gaze_stability_note: gazeNote,
      provisional_recommendations: recs,
      formal_limitations: [
        "Pengujian berbasis web mengandalkan perangkat input keyboard/touch konsumen yang memiliki variansi latensi 10–30 ms.",
        "Metrik okulomotorik webcam 20–30 Hz merupakan indikator kestabilan relatif dan bukan biomarker microsaccade klinis.",
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
        required: [
          "stamina_headline",
          "stamina_description",
          "reaction_style_headline",
          "reaction_style_description",
          "actionable_habits",
        ],
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
        required: [
          "diagnostic_impression",
          "asrs_clinical_correlation",
          "cpt_psychometric_note",
          "gaze_stability_note",
          "provisional_recommendations",
          "formal_limitations",
        ],
      },
    },
    required: ["layperson_insight", "clinical_referral"],
  };

  const prompt = `You are a neuropsychology triage assistant analyzing OculiCare NeuroFocus data.
Generate two structured Indonesian summaries:
1. "layperson_insight": warm, non-stigmatizing, actionable explanation referencing stamina across blocks, sleep/caffeine context, and 3 concrete daily habits.
2. "clinical_referral": objective, formal referral summary for psychologists/psychiatrists citing ASRS v1.1, d-prime, RTV, block-by-block fatigue slope, anticipatory/lapse counts, and physiological confounders (sleep/caffeine/tab switches). Explicitly state non-diagnostic status.
Never diagnose ADHD or prescribe medication. Return pure JSON matching schema.
Payload: ${JSON.stringify(payload)}`;

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
  const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Omit<AnalysisResult, "source" | "is_diagnostic">;
    const validText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 1500;
    const validList = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.length <= 6 && v.every(validText);
    if (
      !parsed.layperson_insight ||
      !parsed.clinical_referral ||
      !validText(parsed.layperson_insight.stamina_headline) ||
      !validText(parsed.layperson_insight.reaction_style_headline) ||
      !validList(parsed.layperson_insight.actionable_habits) ||
      !validText(parsed.clinical_referral.diagnostic_impression)
    ) {
      return null;
    }
    return { ...parsed, source: `gemini-${model}`, is_diagnostic: false };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let payload: AnalyzePayload;
  try {
    payload = (await request.json()) as AnalyzePayload;
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (!validate(payload)) {
    return NextResponse.json({ error: "Metrik CPT tidak lengkap atau di luar rentang." }, { status: 400 });
  }

  try {
    const mlPredictionData = computeMlPrediction(payload);
    const remote = await geminiAnalysis(payload);
    if (remote) {
      return NextResponse.json({
        ...remote,
        ml_prediction: mlPredictionData,
      });
    }
    return NextResponse.json(localAnalysis(payload));
  } catch {
    return NextResponse.json(localAnalysis(payload));
  }
}
