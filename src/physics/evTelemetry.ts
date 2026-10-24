/**
 * EV Physics & Telemetry Engine
 * Strict mathematical modeling of instantaneous power, battery drain, and driving efficiency.
 */

export interface EVVehicleBaseline {
  mass: number; // kg, default 1600
  Cd: number; // drag coefficient, default 0.24
  frontalArea: number; // m², default 2.2
  Crr: number; // rolling resistance coeff, default 0.011
  airDensity: number; // kg/m³, default 1.225
  pIdle: number; // Watts, default 1200
  gravity: number; // m/s², 9.81
  nominalCapacityKwh: number; // default 82 kWh
  usableBufferPct: number; // default 94.5%
  targetSocPct: number; // default 10%
  safetyReservePct: number; // default 5%
  avgEfficiencyKwhPerKm: number; // default 0.15 kWh/km (150 Wh/km)
}

export const DEFAULT_EV_BASELINE: EVVehicleBaseline = {
  mass: 1600,
  Cd: 0.24,
  frontalArea: 2.2,
  Crr: 0.011,
  airDensity: 1.225,
  pIdle: 1200,
  gravity: 9.81,
  nominalCapacityKwh: 82,
  usableBufferPct: 94.5,
  targetSocPct: 10,
  safetyReservePct: 5,
  avgEfficiencyKwhPerKm: 0.15,
};

export interface EVTelemetryInput {
  speedKmh: number; // km/h
  socPct?: number; // state of charge (0-100), default 80%
  targetSpeedKmh?: number; // km/h
  accel: number; // m/s²
  gradeDegrees: number; // degrees
  aggressiveness: number; // 1.0 to 2.5
  trafficAdjust?: {
    vLimitKmh: number;
    vTrafficKmh: number;
    speedVariation: number; // 0.0 to 1.0
    vCurveKmh: number;
  };
}

export interface EVTelemetryResult {
  speedKmh: number;
  speedMs: number;
  targetSpeedMs: number;
  targetSpeedKmh: number;
  gradeDegrees: number;
  gradeRad: number;
  accel: number;
  aggressiveness: number;

  // Power components in Watts & kW
  pAeroW: number;
  pAeroKw: number;
  pRollingW: number;
  pRollingKw: number;
  pGradeW: number;
  pGradeKw: number;
  pInertialW: number;
  pInertialKw: number;

  // Wheel and Drive metrics
  pWheelsW: number;
  pWheelsKw: number;
  drivetrainEfficiency: number; // 0.0 to 1.0 (eta_drive)
  drivetrainEfficiencyPct: number;

  // Regen metrics
  isRegenActive: boolean;
  isHardBraking: boolean;
  etaRegen: number;
  pRegenW: number;
  pRegenKw: number;

  // Battery Net & Range metrics
  socPct: number;
  netUsablePackKwh: number;
  lockedReserveKwh: number;
  availableTripEnergyKwh: number;
  safeUsableRangeKm: number;

  // Battery net impact
  pBattW: number;
  pBattKw: number;
  isCharging: boolean;

  // Formatted output text matching the strict templates
  formattedTemplate: string;
  dashboardUITemplate: string;
}

/**
 * Computes Target Speed (Traffic Adjusted)
 * v_target = min(v_limit, v_traffic * (1 - speed_variation), v_curve)
 */
export function calculateTargetSpeed(
  vLimitMs: number,
  vTrafficMs: number,
  speedVariation: number,
  vCurveMs: number
): number {
  const trafficAdjusted = vTrafficMs * (1 - Math.max(0, Math.min(1, speedVariation)));
  return Math.min(vLimitMs, trafficAdjusted, vCurveMs);
}

/**
 * Calculates instantaneous EV driving telemetry step-by-step using strict physics formulas.
 */
export function calculateEVTelemetry(
  input: EVTelemetryInput,
  baseline: EVVehicleBaseline = DEFAULT_EV_BASELINE
): EVTelemetryResult {
  // 1. Conversions
  const speedMs = input.speedKmh / 3.6;

  // Target speed calculation
  let targetSpeedMs = (input.targetSpeedKmh ?? input.speedKmh) / 3.6;
  if (input.trafficAdjust) {
    const vLimitMs = input.trafficAdjust.vLimitKmh / 3.6;
    const vTrafficMs = input.trafficAdjust.vTrafficKmh / 3.6;
    const vCurveMs = input.trafficAdjust.vCurveKmh / 3.6;
    targetSpeedMs = calculateTargetSpeed(
      vLimitMs,
      vTrafficMs,
      input.trafficAdjust.speedVariation,
      vCurveMs
    );
  }
  const targetSpeedKmh = targetSpeedMs * 3.6;

  const gradeRad = (input.gradeDegrees * Math.PI) / 180;
  const a = input.accel;
  const agg = Math.max(1.0, Math.min(2.5, input.aggressiveness));

  // 2. Component Calculations (Watts)
  // P_aero = 0.5 * 1.225 * Cd * Area * v^3
  const pAeroW = 0.5 * baseline.airDensity * baseline.Cd * baseline.frontalArea * Math.pow(speedMs, 3);

  // P_rolling = Crr * mass * 9.81 * cos(grade_angle) * v
  const pRollingW = baseline.Crr * baseline.mass * baseline.gravity * Math.cos(gradeRad) * speedMs;

  // P_grade = mass * 9.81 * sin(grade_angle) * v
  const pGradeW = baseline.mass * baseline.gravity * Math.sin(gradeRad) * speedMs;

  // P_inertial = mass * acceleration * v
  const pInertialW = baseline.mass * a * speedMs;

  // Total Wheel Power: P_wheels = P_aero + P_rolling + P_grade + P_inertial
  const pWheelsW = pAeroW + pRollingW + pGradeW + pInertialW;

  // 3. Drivetrain Efficiency Penalty (Aggressive Driving)
  // If acceleration (a) > 1.2 m/s²:
  // eta_drive = max(0.70, 0.92 - 0.02 * (a - 1.2)^2 * aggressiveness_factor)
  // Else: eta_drive = 0.92
  let etaDrive = 0.92;
  if (a > 1.2) {
    etaDrive = Math.max(0.70, 0.92 - 0.02 * Math.pow(a - 1.2, 2) * agg);
  }

  // 4. Regenerative Braking (P_regen in Watts)
  // If acceleration (a) < 0:
  //   If abs(a) <= 2.2 m/s² (Max Regen Limit):
  //     P_regen = 0.85 * mass * abs(a) * v
  //   Else (Hard Braking - friction brakes waste energy):
  //     eta_regen = 0.85 * (2.2 / abs(a))
  //     P_regen = eta_regen * mass * 2.2 * v
  let pRegenW = 0;
  let isRegenActive = false;
  let isHardBraking = false;
  let etaRegen = 0;

  if (a < 0 && speedMs > 0) {
    isRegenActive = true;
    const absA = Math.abs(a);
    if (absA <= 2.2) {
      pRegenW = 0.85 * baseline.mass * absA * speedMs;
      etaRegen = 0.85;
    } else {
      isHardBraking = true;
      etaRegen = 0.85 * (2.2 / absA);
      pRegenW = etaRegen * baseline.mass * 2.2 * speedMs;
    }
  }

  // 5. Net Battery Power (P_batt in Watts)
  // If P_wheels >= 0 (Discharging): P_batt = (P_wheels / eta_drive) + P_idle
  // If P_wheels < 0 (Regen): P_batt = -P_regen + P_idle
  // (Standard P_idle = 1200 W for HVAC and electronics)
  let pBattW: number;
  if (pWheelsW >= 0) {
    pBattW = pWheelsW / etaDrive + baseline.pIdle;
  } else {
    pBattW = -pRegenW + baseline.pIdle;
  }

  const pAeroKw = pAeroW / 1000;
  const pRollingKw = pRollingW / 1000;
  const pGradeKw = pGradeW / 1000;
  const pInertialKw = pInertialW / 1000;
  const pWheelsKw = pWheelsW / 1000;
  const pRegenKw = pRegenW / 1000;
  const pBattKw = pBattW / 1000;
  const isCharging = pBattKw < 0;

  // Battery Pack & Safe Usable Range Math
  const socPct = input.socPct ?? 80;
  const netUsablePackKwh = baseline.nominalCapacityKwh * (baseline.usableBufferPct / 100);
  const lockedReserveKwh = netUsablePackKwh * (Math.max(baseline.targetSocPct, baseline.safetyReservePct) / 100);
  const availableTripEnergyKwh = Math.max(0, (netUsablePackKwh * (socPct / 100)) - lockedReserveKwh);
  const safeUsableRangeKm = Math.max(0, availableTripEnergyKwh / baseline.avgEfficiencyKwhPerKm);

  const formattedTemplate = `**1. Conversions:**
- Speed: ${speedMs.toFixed(2)} m/s

**2. Component Calculations:**
- Aerodynamic Power: ${pAeroKw.toFixed(2)} kW
- Rolling Power: ${pRollingKw.toFixed(2)} kW
- Grade Power: ${pGradeKw.toFixed(2)} kW
- Inertial Power: ${pInertialKw.toFixed(2)} kW

**3. Net Battery Impact:**
- Drivetrain Efficiency: ${(etaDrive * 100).toFixed(1)}%
- Total Wheel Power: ${pWheelsKw.toFixed(2)} kW
- Regen Power Captured: ${pRegenKw.toFixed(2)} kW
- **Net Battery Power Draw:** ${pBattKw.toFixed(2)} kW (${isCharging ? "Negative = charging" : "Positive = draining"})`;

  const dashboardUITemplate = `=========================================
          ⚡ LIVE EV DASHBOARD ⚡
=========================================
🚗 SPEED: ${Math.round(input.speedKmh)} km/h       🔋 BATTERY: ${Math.round(socPct)}%
-----------------------------------------
🟢 SAFE USABLE RANGE:      ${safeUsableRangeKm.toFixed(1)} km
⚡ AVAILABLE TRIP ENERGY:  ${availableTripEnergyKwh.toFixed(1)} kWh
📈 INSTANT POWER DRAW:     ${pBattKw.toFixed(1)} kW
=========================================
🛠️ SYSTEM DIAGNOSTICS (Background Math)
- Net Usable Pack: ${netUsablePackKwh.toFixed(1)} kWh
- Locked Reserve: ${lockedReserveKwh.toFixed(1)} kWh
- Aero Drag Power: ${pAeroKw.toFixed(1)} kW
- Drivetrain Efficiency: ${(etaDrive * 100).toFixed(1)}%
=========================================`;

  return {
    speedKmh: input.speedKmh,
    speedMs,
    targetSpeedMs,
    targetSpeedKmh,
    gradeDegrees: input.gradeDegrees,
    gradeRad,
    accel: input.accel,
    aggressiveness: agg,

    pAeroW,
    pAeroKw,
    pRollingW,
    pRollingKw,
    pGradeW,
    pGradeKw,
    pInertialW,
    pInertialKw,

    pWheelsW,
    pWheelsKw,
    drivetrainEfficiency: etaDrive,
    drivetrainEfficiencyPct: etaDrive * 100,

    isRegenActive,
    isHardBraking,
    etaRegen,
    pRegenW,
    pRegenKw,

    // Battery Net & Range metrics
    socPct,
    netUsablePackKwh,
    lockedReserveKwh,
    availableTripEnergyKwh,
    safeUsableRangeKm,

    pBattW,
    pBattKw,
    isCharging,

    formattedTemplate,
    dashboardUITemplate,
  };
}

/**
 * Parses user input strings in formats:
 * `Raw Data: Speed=[km/h], SOC=[%], Accel=[m/s²], Grade=[deg], Aggressiveness=[1.0-2.5]`
 * or `Speed: [km/h], Target Speed: [km/h], Accel: [m/s²], ...`
 */
export function parseTelemetryInputString(raw: string): Partial<EVTelemetryInput> | null {
  try {
    const getVal = (pattern: RegExp): number | undefined => {
      const match = raw.match(pattern);
      return match ? parseFloat(match[1]) : undefined;
    };

    const speed = getVal(/Speed\s*[:=]\s*([-\d.]+)/i);
    const soc = getVal(/SOC\s*[:=]\s*([-\d.]+)/i);
    const targetSpeed = getVal(/Target\s*Speed\s*[:=]\s*([-\d.]+)/i);
    const accel = getVal(/Accel(?:eration)?\s*[:=]\s*([-\d.]+)/i);
    const grade = getVal(/Grade\s*[:=]\s*([-\d.]+)/i);
    const agg = getVal(/Aggressiveness\s*[:=]\s*([-\d.]+)/i);

    if (speed === undefined && accel === undefined && soc === undefined) return null;

    return {
      speedKmh: speed ?? 100,
      socPct: soc ?? 80,
      targetSpeedKmh: targetSpeed ?? speed ?? 100,
      accel: accel ?? 0,
      gradeDegrees: grade ?? 0,
      aggressiveness: agg ?? 1.0,
    };
  } catch {
    return null;
  }
}
