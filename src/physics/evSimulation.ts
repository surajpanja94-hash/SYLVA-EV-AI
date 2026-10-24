/**
 * Automated EV Driving Simulator Loop
 * Generates continuous, physically consistent driving cycles and telemetry.
 */

import {
  calculateEVTelemetry,
  DEFAULT_EV_BASELINE,
  type EVTelemetryInput,
  type EVTelemetryResult,
  type EVVehicleBaseline,
} from "./evTelemetry";

export type DriveProfileId =
  | "highway-cruise"
  | "mountain-pass"
  | "urban-traffic"
  | "performance-sprint";

export interface DriveProfile {
  id: DriveProfileId;
  name: string;
  description: string;
  color: string;
  durationSeconds: number;
  generateTelemetry: (t: number) => {
    speedKmh: number;
    targetSpeedKmh: number;
    accel: number;
    gradeDegrees: number;
    aggressiveness: number;
    phaseTitle: string;
    phaseDescription: string;
    trafficAdjust?: {
      vLimitKmh: number;
      vTrafficKmh: number;
      speedVariation: number;
      vCurveKmh: number;
    };
  };
}

export interface EVVehicleModel {
  id: string;
  name: string;
  category: string;
  baseline: EVVehicleBaseline;
}

export const EV_VEHICLE_MODELS: EVVehicleModel[] = [
  {
    id: "sylva-standard",
    name: "Sylva Baseline EV",
    category: "Balanced Sedan",
    baseline: { ...DEFAULT_EV_BASELINE },
  },
  {
    id: "aero-streamliner",
    name: "Aero Concept EV",
    category: "Ultra-Low Drag",
    baseline: {
      ...DEFAULT_EV_BASELINE,
      mass: 1480,
      Cd: 0.20,
      frontalArea: 2.05,
      Crr: 0.009,
      airDensity: 1.225,
      pIdle: 1100,
      gravity: 9.81,
      nominalCapacityKwh: 75,
      avgEfficiencyKwhPerKm: 0.13,
    },
  },
  {
    id: "terra-allroad",
    name: "Terra Adventure Dual",
    category: "Dual Motor All-Terrain",
    baseline: {
      ...DEFAULT_EV_BASELINE,
      mass: 2200,
      Cd: 0.29,
      frontalArea: 2.55,
      Crr: 0.013,
      airDensity: 1.225,
      pIdle: 1400,
      gravity: 9.81,
      nominalCapacityKwh: 100,
      avgEfficiencyKwhPerKm: 0.19,
    },
  },
];

export const DRIVE_PROFILES: DriveProfile[] = [
  {
    id: "highway-cruise",
    name: "Highway Autopilot",
    description: "Smooth high-efficiency long distance cruise with lane pacing",
    color: "#10b981", // Emerald
    durationSeconds: 30,
    generateTelemetry: (t: number) => {
      // Loop every 30s
      const tau = (t % 30) / 30;
      const baseSpeed = 105 + Math.sin(tau * Math.PI * 4) * 6;
      const targetSpeed = 110;
      const accel = Math.cos(tau * Math.PI * 4) * 0.35;
      const grade = Math.sin(tau * Math.PI * 2) * 1.2;
      const agg = 1.05 + Math.abs(Math.sin(tau * Math.PI)) * 0.15;

      let phaseTitle = "Smooth Highway Cruise";
      let phaseDescription = "Low inertial load, optimal aerodynamic efficiency";
      if (grade > 0.6) {
        phaseTitle = "Gentle Highway Overpass (+1.2°)";
        phaseDescription = "Mild grade compensation, steady speed";
      } else if (grade < -0.6) {
        phaseTitle = "Gentle Descent (-1.1°)";
        phaseDescription = "Kinetic glide with light rolling momentum";
      }

      return {
        speedKmh: Math.max(80, baseSpeed),
        targetSpeedKmh: targetSpeed,
        accel: parseFloat(accel.toFixed(2)),
        gradeDegrees: parseFloat(grade.toFixed(1)),
        aggressiveness: parseFloat(agg.toFixed(2)),
        phaseTitle,
        phaseDescription,
        trafficAdjust: {
          vLimitKmh: 120,
          vTrafficKmh: 112,
          speedVariation: 0.06,
          vCurveKmh: 130,
        },
      };
    },
  },
  {
    id: "mountain-pass",
    name: "Mountain Grade & Regen",
    description: "Steep climbing ascent followed by continuous regenerative braking descent",
    color: "#06b6d4", // Cyan
    durationSeconds: 40,
    generateTelemetry: (t: number) => {
      // 0-20s: Climbing uphill (+3° to +8°)
      // 20-40s: Descending downhill (-3° to -8°) with active regen
      const tau = (t % 40) / 40;
      const isClimbing = tau < 0.5;

      if (isClimbing) {
        const climbProgress = tau / 0.5; // 0 to 1
        const grade = 3.5 + Math.sin(climbProgress * Math.PI) * 4.5; // 3.5 to 8.0 deg
        const speed = 72 - Math.sin(climbProgress * Math.PI) * 12;
        const accel = 0.4 + Math.sin(climbProgress * Math.PI * 2) * 0.4;
        const agg = 1.25;

        return {
          speedKmh: Math.max(50, speed),
          targetSpeedKmh: 75,
          accel: parseFloat(accel.toFixed(2)),
          gradeDegrees: parseFloat(grade.toFixed(1)),
          aggressiveness: agg,
          phaseTitle: `Mountain Ascent (+${grade.toFixed(1)}° Grade)`,
          phaseDescription: "High gravitational potential energy load on battery",
          trafficAdjust: {
            vLimitKmh: 80,
            vTrafficKmh: 75,
            speedVariation: 0.08,
            vCurveKmh: 68,
          },
        };
      } else {
        const descentProgress = (tau - 0.5) / 0.5; // 0 to 1
        const grade = -(3.5 + Math.sin(descentProgress * Math.PI) * 4.2); // -3.5 to -7.7 deg
        const speed = 78 + Math.sin(descentProgress * Math.PI) * 8;
        // Negative acceleration for regenerative braking: -1.2 to -2.0 m/s²
        const accel = -(1.1 + Math.sin(descentProgress * Math.PI) * 0.85);
        const agg = 1.1;

        return {
          speedKmh: Math.max(55, speed),
          targetSpeedKmh: 70,
          accel: parseFloat(accel.toFixed(2)),
          gradeDegrees: parseFloat(grade.toFixed(1)),
          aggressiveness: agg,
          phaseTitle: `Downhill Descent (${grade.toFixed(1)}° Grade)`,
          phaseDescription: "Continuous regenerative braking recharging high-voltage pack",
          trafficAdjust: {
            vLimitKmh: 75,
            vTrafficKmh: 70,
            speedVariation: 0.05,
            vCurveKmh: 65,
          },
        };
      }
    },
  },
  {
    id: "urban-traffic",
    name: "Urban Stop & Go",
    description: "Traffic pacing, traffic signal stops, gentle launch and regen capture",
    color: "#f59e0b", // Amber
    durationSeconds: 32,
    generateTelemetry: (t: number) => {
      const tau = (t % 32) / 32;

      let speedKmh = 45;
      let accel = 0;
      let phaseTitle = "Urban Street Pacing";
      let phaseDescription = "Moderate speed with cross traffic awareness";

      if (tau < 0.25) {
        // Accelerating from green light (0 -> 48 km/h)
        const p = tau / 0.25;
        speedKmh = p * 48;
        accel = 1.1 * (1 - p * 0.3);
        phaseTitle = "Traffic Launch from Stop";
        phaseDescription = "Smooth acceleration within optimal 92% drivetrain efficiency";
      } else if (tau < 0.55) {
        // Cruising around 48 km/h
        const p = (tau - 0.25) / 0.3;
        speedKmh = 48 + Math.sin(p * Math.PI * 2) * 4;
        accel = Math.cos(p * Math.PI * 2) * 0.25;
        phaseTitle = "City Avenue Flow";
        phaseDescription = "Traffic speed variation: 12% dynamic buffer";
      } else if (tau < 0.78) {
        // Red light deceleration: regen braking
        const p = (tau - 0.55) / 0.23;
        speedKmh = Math.max(3, 48 * (1 - p));
        accel = -1.6;
        phaseTitle = "Decelerating for Signal (Regen Active)";
        phaseDescription = "Max regen capture at -1.6 m/s²: zero brake pad wear";
      } else {
        // Idle at stoplight
        speedKmh = 0;
        accel = 0;
        phaseTitle = "Stationary at Intersection";
        phaseDescription = "HVAC & electronics idle auxiliary load (1.2 kW)";
      }

      return {
        speedKmh: Math.max(0, speedKmh),
        targetSpeedKmh: 50,
        accel: parseFloat(accel.toFixed(2)),
        gradeDegrees: 0.5,
        aggressiveness: 1.15,
        phaseTitle,
        phaseDescription,
        trafficAdjust: {
          vLimitKmh: 50,
          vTrafficKmh: 42,
          speedVariation: 0.14,
          vCurveKmh: 45,
        },
      };
    },
  },
  {
    id: "performance-sprint",
    name: "Performance Sprint",
    description: "Launch acceleration > 1.2 m/s² efficiency penalty & threshold friction braking",
    color: "#ef4444", // Rose/Red
    durationSeconds: 28,
    generateTelemetry: (t: number) => {
      const tau = (t % 28) / 28;

      let speedKmh = 100;
      let accel = 0;
      let agg = 2.2;
      let phaseTitle = "Performance High-Speed Run";
      let phaseDescription = "Aggressive telemetry profile";

      if (tau < 0.28) {
        // Hard Launch acceleration: a = 2.4 m/s²
        const p = tau / 0.28;
        speedKmh = 50 + p * 80; // 50 to 130 km/h
        accel = 2.4 - p * 0.6; // 2.4 down to 1.8 m/s²
        agg = 2.3;
        phaseTitle = "Full-Throttle Sprint (a > 1.2 m/s²)";
        phaseDescription = "Drivetrain penalty active: η_drive reduced from 92% to ~79%";
      } else if (tau < 0.62) {
        // High speed sweeping corner
        const p = (tau - 0.28) / 0.34;
        speedKmh = 125 + Math.sin(p * Math.PI) * 10;
        accel = Math.cos(p * Math.PI * 2) * 0.4;
        agg = 1.8;
        phaseTitle = "High-Speed Curve Stability";
        phaseDescription = "High aerodynamic drag (P_aero > 14 kW)";
      } else if (tau < 0.85) {
        // Hard threshold braking: a = -3.2 m/s² (exceeds 2.2 m/s² limit!)
        const p = (tau - 0.62) / 0.23;
        speedKmh = Math.max(25, 130 - p * 95);
        accel = -3.2;
        agg = 2.1;
        phaseTitle = "Hard Threshold Braking (|a| > 2.2 m/s²)";
        phaseDescription = "Friction brakes engage: regen capped, kinetic energy lost to heat";
      } else {
        // Recovery corner exit
        const p = (tau - 0.85) / 0.15;
        speedKmh = 35 + p * 40;
        accel = 1.4;
        agg = 1.9;
        phaseTitle = "Corner Exit Acceleration";
        phaseDescription = "Aggressive throttle input pulling out of hairpin";
      }

      return {
        speedKmh: Math.max(0, speedKmh),
        targetSpeedKmh: 140,
        accel: parseFloat(accel.toFixed(2)),
        gradeDegrees: 1.0,
        aggressiveness: agg,
        phaseTitle,
        phaseDescription,
        trafficAdjust: {
          vLimitKmh: 140,
          vTrafficKmh: 135,
          speedVariation: 0.05,
          vCurveKmh: 110,
        },
      };
    },
  },
];
