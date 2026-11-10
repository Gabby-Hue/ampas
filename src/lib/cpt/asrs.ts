export type AsrsQuestion = {
  id: number;
  question: string;
  context: string;
  threshold: number; // nilai minimal (0-4) yang dihitung sebagai indikasi gejala
};

export const ASRS_QUESTIONS: AsrsQuestion[] = [
  {
    id: 1,
    question: "Seberapa sering kamu kesulitan menyelesaikan bagian akhir dari suatu tugas atau proyek setelah bagian yang rumit selesai?",
    context: "Mengukur daya tahan penyelesaian tugas (Inattention).",
    threshold: 2, // Kadang-kadang / Sering / Sangat Sering
  },
  {
    id: 2,
    question: "Seberapa sering kamu kesulitan mengatur sesuatu saat harus mengerjakan tugas yang membutuhkan kerapian dan keteraturan?",
    context: "Mengukur fungsi eksekutif organisasi tugas (Executive Function).",
    threshold: 2,
  },
  {
    id: 3,
    question: "Seberapa sering kamu lupa janji temu, kewajiban, atau hal yang harus kamu kerjakan hari itu?",
    context: "Mengukur memori kerja prospektif harian (Working Memory).",
    threshold: 2,
  },
  {
    id: 4,
    question: "Saat ada tugas yang membutuhkan konsentrasi berpikir mendalam, seberapa sering kamu menunda atau menghindarinya?",
    context: "Mengukur kelelahan terhadap beban kognitif statis (Cognitive Avoidance).",
    threshold: 2,
  },
  {
    id: 5,
    question: "Seberapa sering kamu merasa resah, memainkan jari/kaki, atau menggeliat saat harus duduk tenang dalam waktu cukup lama?",
    context: "Mengukur kegelisahan motorik halus (Motor Restlessness).",
    threshold: 2,
  },
  {
    id: 6,
    question: "Seberapa sering kamu merasa terlalu aktif atau terdorong untuk terus melakukan sesuatu seolah-olah digerakkan oleh motor?",
    context: "Mengukur dorongan hiperaktivitas internal (Hyperactivity Drive).",
    threshold: 2,
  },
];

export const ASRS_OPTIONS = [
  { label: "Tidak Pernah", value: 0 },
  { label: "Jarang", value: 1 },
  { label: "Kadang-kadang", value: 2 },
  { label: "Sering", value: 3 },
  { label: "Sangat Sering", value: 4 },
];

export type AsrsResult = {
  totalScore: number; // 0-24
  significantCount: number; // jumlah item di atas threshold (0-6)
  isSignificant: boolean; // signifikan jika >= 4 item di atas threshold
  interpretationLay: string;
  interpretationClinical: string;
};

export function scoreAsrs(answers: Record<number, number>): AsrsResult {
  let totalScore = 0;
  let significantCount = 0;

  for (const q of ASRS_QUESTIONS) {
    const val = answers[q.id] ?? 0;
    totalScore += val;
    if (val >= q.threshold) {
      significantCount += 1;
    }
  }

  const isSignificant = significantCount >= 4;

  const interpretationLay = isSignificant
    ? "Pengakuan harianmu menunjukkan frekuensi kesulitan konsentrasi dan pengaturan diri yang cukup sering dirasakan dalam 6 bulan terakhir."
    : "Pengakuan harianmu berada dalam rentang wajar dan belum menunjukkan pola kesulitan konsentrasi kronis yang berat.";

  const interpretationClinical = isSignificant
    ? `Skor ASRS v1.1 Part A menunjukkan ${significantCount}/6 item positif (ambang batas klinis WHO ≥4). Pola ini mengindikasikan keluhan inatensi/impulsivitas kronis yang relevan untuk evaluasi diagnostik lebih lanjut.`
    : `Skor ASRS v1.1 Part A menunjukkan ${significantCount}/6 item positif (di bawah ambang batas klinis WHO ≥4). Gejala subjektif berada dalam batas toleransi populasi umum.`;

  return {
    totalScore,
    significantCount,
    isSignificant,
    interpretationLay,
    interpretationClinical,
  };
}
