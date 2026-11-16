export type LetterGrade = "A+" | "A" | "B" | "C" | "D" | "E" | "F";

export function gradeFor(percentage: number): LetterGrade {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

export function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function percentage(part: number, total: number) {
  if (!total) return 0;
  return round((part / total) * 100);
}
