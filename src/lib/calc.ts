/** Aplica regras de tolerância e intervalo/almoco */
export function applyRules(durationSec:number, cfg:{
  toleranceMinutes?: number,
  lunchBreakMinutes?: number,
  lunchThresholdMinutes?: number
}){
  let sec = durationSec;
  const tol = Math.max(0, cfg.toleranceMinutes || 0) * 60;
  if (tol > 0) {
    // arredondar para o múltiplo de tolerância mais próximo
    sec = Math.round(sec / tol) * tol;
  }
  const threshold = Math.max(0, cfg.lunchThresholdMinutes || 0) * 60;
  const lunch = Math.max(0, cfg.lunchBreakMinutes || 0) * 60;
  if (threshold > 0 && lunch > 0 && sec >= threshold) {
    sec = Math.max(0, sec - lunch);
  }
  return sec;
}

export function earningsFromSeconds(durationSec:number, hourlyRate:number){
  return Number(((durationSec/3600) * (hourlyRate || 0)).toFixed(2));
}
