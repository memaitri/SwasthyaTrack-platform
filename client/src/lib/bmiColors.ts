export function getBMIClassification(bmi: number): 'underweight' | 'normal' | 'overweight' | 'obese' {
  if (bmi < 18.5) return 'underweight';
  if (bmi >= 18.5 && bmi < 25) return 'normal';
  if (bmi >= 25 && bmi < 30) return 'overweight';
  return 'obese';
}

export function getBMIColor(bmi: number | null | undefined): string {
  if (!bmi) return 'text-muted-foreground';
  const classification = getBMIClassification(bmi);
  return {
    normal: 'text-emerald-600 dark:text-emerald-400 font-semibold',
    underweight: 'text-amber-600 dark:text-amber-400 font-semibold',
    overweight: 'text-orange-600 dark:text-orange-400 font-semibold',
    obese: 'text-rose-600 dark:text-rose-400 font-semibold',
  }[classification];
}

export function getBMIBgColor(bmi: number | null | undefined): string {
  if (!bmi) return 'bg-muted/30';
  const classification = getBMIClassification(bmi);
  return {
    normal: 'bg-emerald-50 dark:bg-emerald-950/30',
    underweight: 'bg-amber-50 dark:bg-amber-950/30',
    overweight: 'bg-orange-50 dark:bg-orange-950/30',
    obese: 'bg-rose-50 dark:bg-rose-950/30',
  }[classification];
}

export function getBMIClassificationLabel(bmi: number): string {
  const classification = getBMIClassification(bmi);
  return {
    underweight: 'Underweight (≤ -3 SD)',
    normal: 'Normal',
    overweight: 'Overweight (≥ +2 SD)',
    obese: 'Obese',
  }[classification];
}
