import React, { useState, useMemo, useEffect } from "react";
import {
  Battery,
  BatteryCharging,
  Gauge,
  Zap,
  Wind,
  Layers,
  Thermometer,
  Compass,
  Navigation,
  Car,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Activity,
  AlertTriangle,
  TrendingUp,
  Snowflake,
  Sun,
  CloudRain,
  ShieldCheck,
  Cpu,
  Home,
  MapPin,
} from "lucide-react";
import {
  calculateEVTelemetry,
  DEFAULT_EV_BASELINE,
  type EVTelemetryInput,
  type EVVehicleBaseline,
} from "../physics/evTelemetry";
import {
  optimizeEVRoute,
  DEFAULT_ROUTE_PAYLOAD,
  type RoutePlannerPayload,
} from "../physics/evRoutePlanner";
import { DRIVE_PROFILES, type DriveProfileId } from "../physics/evSimulation";
import { EVRouteMapModule } from "./EVRouteMapModule";

export interface EVTelemetryPanelContainerProps {
  currentVariant?: string;
  onVariantChange?: (variant: string) => void;
  onBackToHome?: () => void;
  initialFocusedModule?: number;
  initialViewMode?: "grid" | "single";
}

export function EVTelemetryPanelContainer({
  currentVariant = "living-green",
  onVariantChange,
  onBackToHome,
  initialFocusedModule = 1,
  initialViewMode = "grid",
}: EVTelemetryPanelContainerProps) {
  // Autopilot loop state
  const [isAutoSim, setIsAutoSim] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [activeProfileId, setActiveProfileId] = useState<DriveProfileId>("mountain-pass");
  const [simTime, setSimTime] = useState<number>(0);

  // Layout View Mode: "grid" (all 8 simultaneously) or "single" (focus on 1)
  const [viewMode, setViewMode] = useState<"grid" | "single">(initialViewMode);
  const [focusedModule, setFocusedModule] = useState<number>(initialFocusedModule);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [glassStyle, setGlassStyle] = useState<"clear" | "subtle" | "medium">("subtle");
  const [copiedAscii, setCopiedAscii] = useState<boolean>(false);

  useEffect(() => {
    if (initialFocusedModule) {
      setFocusedModule(initialFocusedModule);
    }
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialFocusedModule, initialViewMode]);

  // ────────────────────────────────────────────────────────────
  // 8 Individual Modules State
  // ────────────────────────────────────────────────────────────
  // Module 1: Battery Health & Capacity
  const [nominalKwh, setNominalKwh] = useState<number>(82);
  const [sohPct, setSohPct] = useState<number>(96);
  const [socPct, setSocPct] = useState<number>(78);
  const [safetyReservePct, setSafetyReservePct] = useState<number>(10);

  // Module 2: Drive Dynamics & Speed Drag
  const [speedKmh, setSpeedKmh] = useState<number>(102);
  const [accel, setAccel] = useState<number>(1.2);
  const [aggressiveness, setAggressiveness] = useState<number>(1.4);

  // Module 3: Regenerative Efficiency & Braking
  const [gradeDegrees, setGradeDegrees] = useState<number>(-3.5);
  const [regenDemand, setRegenDemand] = useState<number>(-1.5); // m/s²

  // Module 4: HVAC & Thermal Load
  const [ambientTempC, setAmbientTempC] = useState<number>(8);
  const [targetCabinTempC, setTargetCabinTempC] = useState<number>(21);
  const [ecoSeatHeater, setEcoSeatHeater] = useState<boolean>(true);

  // Module 5: Route Planner & Range Forecast
  const [routeDistKm, setRouteDistKm] = useState<number>(185);
  const [routeElevM, setRouteElevM] = useState<number>(650);
  const [trafficLevel, setTrafficLevel] = useState<"Low" | "Moderate" | "Heavy">("Moderate");

  // Module 6: Tire Pressure & Road Surface
  const [tireFL, setTireFL] = useState<number>(38);
  const [tireFR, setTireFR] = useState<number>(38);
  const [tireRL, setTireRL] = useState<number>(39);
  const [tireRR, setTireRR] = useState<number>(39);
  const [roadSurface, setRoadSurface] = useState<"Dry" | "Wet Rain" | "Snow / Ice">("Wet Rain");

  // Module 7: Payload Distribution & Mass
  const [passengersCount, setPassengersCount] = useState<number>(2); // 75kg each
  const [cargoKg, setCargoKg] = useState<number>(45);

  // Module 8: Diagnostics & Flow
  // Derived live below

  // Automation clock
  useEffect(() => {
    if (!isAutoSim) return;
    let rafId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setSimTime((prev) => prev + dt * simSpeed);
      rafId = requestAnimationFrame(loop);
    };

    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isAutoSim, simSpeed]);

  // Sync automated profile values into dynamics when auto is ON
  const activeProfile = useMemo(() => {
    return DRIVE_PROFILES.find((p) => p.id === activeProfileId) || DRIVE_PROFILES[0];
  }, [activeProfileId]);

  useEffect(() => {
    if (!isAutoSim) return;
    const sim = activeProfile.generateTelemetry(simTime);
    setSpeedKmh(sim.speedKmh);
    setAccel(sim.accel);
    setGradeDegrees(sim.gradeDegrees);
    setAggressiveness(sim.aggressiveness);
  }, [isAutoSim, simTime, activeProfile]);

  // ────────────────────────────────────────────────────────────
  // Physics Computations across all 8 modules
  // ────────────────────────────────────────────────────────────
  // Module 1 Math
  const hardwareBufferPct = 94.5;
  const trueUsableKwh = nominalKwh * (sohPct / 100) * (hardwareBufferPct / 100);
  const availableEnergyKwh = trueUsableKwh * (socPct / 100);
  const lockedReserveKwh = trueUsableKwh * (safetyReservePct / 100);
  const usableTripEnergyKwh = Math.max(0, availableEnergyKwh - lockedReserveKwh);
  const safeUsableRangeKm = usableTripEnergyKwh / 0.15; // 150 Wh/km

  // Module 7 Math: Payload & Total Mass
  const baseMassKg = 1600;
  const payloadMassKg = passengersCount * 75 + cargoKg;
  const totalMassKg = baseMassKg + payloadMassKg;
  // Weight balance front / rear
  const frontWeightPct = Math.round(
    ((baseMassKg * 0.5 + passengersCount * 45) / totalMassKg) * 100
  );
  const rearWeightPct = 100 - frontWeightPct;

  // Module 6 Math: Crr adjustments
  let surfaceCrr = 0.011;
  if (roadSurface === "Wet Rain") surfaceCrr *= 1.25;
  if (roadSurface === "Snow / Ice") surfaceCrr *= 1.5;
  const avgPsi = (tireFL + tireFR + tireRL + tireRR) / 4;
  if (avgPsi < 35) surfaceCrr += (35 - avgPsi) * 0.0006;

  // Module 4 Math: HVAC
  const deltaT = Math.abs(targetCabinTempC - ambientTempC);
  let hvacKw = 1.0 + 0.1 * deltaT;
  if (ecoSeatHeater) hvacKw = Math.max(0.6, hvacKw - 0.7);

  // Module 2 & 3 Math: Live Physics using calculateEVTelemetry
  const liveBaseline: EVVehicleBaseline = useMemo(() => {
    return {
      ...DEFAULT_EV_BASELINE,
      mass: totalMassKg,
      Crr: surfaceCrr,
      pIdle: Math.round(hvacKw * 1000),
      nominalCapacityKwh: nominalKwh,
      usableBufferPct: hardwareBufferPct,
      targetSocPct: safetyReservePct,
    };
  }, [totalMassKg, surfaceCrr, hvacKw, nominalKwh, safetyReservePct]);

  const liveTelemetry = useMemo(() => {
    const input: EVTelemetryInput = {
      speedKmh,
      socPct,
      accel,
      gradeDegrees,
      aggressiveness,
    };
    return calculateEVTelemetry(input, liveBaseline);
  }, [speedKmh, socPct, accel, gradeDegrees, aggressiveness, liveBaseline]);

  // Module 5 Math: Route Optimization
  const routePayload: RoutePlannerPayload = useMemo(() => {
    return {
      route: {
        distanceKm: routeDistKm,
        elevationChangeM: routeElevM,
        trafficLevel,
        speedKmh: speedKmh > 0 ? speedKmh : 95,
      },
      vehicle: {
        nominalKwh,
        sohPct,
        currentSocPct: socPct,
        baseMassKg,
        payloadKg: payloadMassKg,
        usableHardwareBufferPct: hardwareBufferPct,
      },
      environment: {
        tempC: ambientTempC,
        weather: roadSurface === "Snow / Ice" ? "Snow / Ice" : roadSurface === "Wet Rain" ? "Rain / Wet" : "Clear",
        windKmh: 12,
      },
      settings: {
        safetyReservePct,
        targetCabinTempC,
      },
    };
  }, [
    routeDistKm,
    routeElevM,
    trafficLevel,
    speedKmh,
    nominalKwh,
    sohPct,
    socPct,
    baseMassKg,
    payloadMassKg,
    ambientTempC,
    roadSurface,
    safetyReservePct,
    targetCabinTempC,
  ]);

  const routeResult = useMemo(() => optimizeEVRoute(routePayload), [routePayload]);

  // Glass card style
  const glassCard =
    glassStyle === "clear"
      ? "bg-black/15 backdrop-blur-sm border border-white/10"
      : glassStyle === "subtle"
      ? "bg-black/25 backdrop-blur-md border border-white/15"
      : "bg-black/45 backdrop-blur-lg border border-white/20";

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden font-sans">
      {/* ────────────────────────────────────────────────────────────
          HEADER: Master Controls, Layout Mode, Transparency, Autopilot
          ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-2.5 pointer-events-auto">
        {/* Left: Brand & Autopilot Status */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl ${glassCard} text-white shadow-xl`}>
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/25 text-white transition cursor-pointer text-xs font-mono font-medium"
              title="Return to Home Screen"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span>Home</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase font-mono text-emerald-400">
              8-Module EV Architecture
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Autopilot Play/Pause */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAutoSim(!isAutoSim)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
              title={isAutoSim ? "Pause Autopilot" : "Resume Autopilot"}
            >
              {isAutoSim ? <Pause className="w-3.5 h-3.5 text-amber-300" /> : <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />}
            </button>
            <button
              onClick={() => setSimSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 5 : 1))}
              className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 hover:bg-white/20 text-white/90 cursor-pointer"
              title="Simulation speed multiplier"
            >
              {simSpeed}x
            </button>
            <button
              onClick={() => setSimTime(0)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
              title="Reset cycle"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Center: View Mode (Grid vs Focus Single) & 8 Module Quick Pills */}
        <div className={`flex items-center gap-1.5 p-1 rounded-2xl ${glassCard} text-white shadow-xl`}>
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === "grid"
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Grid View</span>
          </button>

          <button
            onClick={() => setViewMode("single")}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === "single"
                ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Focus Mode</span>
          </button>

          {/* Module 1-9 Quick Numbers if in Single mode */}
          {viewMode === "single" && (
            <div className="flex items-center gap-1 pl-1 border-l border-white/15">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => setFocusedModule(num)}
                  className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer flex items-center justify-center ${
                    focusedModule === num
                      ? "bg-white/30 text-white border border-white/40 shadow-sm"
                      : "text-white/50 hover:text-white hover:bg-white/10"
                  }`}
                  title={num === 9 ? "Google Maps EV Routes" : `Module ${num}`}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Glass Toggle, Minimize Deck & Zen Mode */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl ${glassCard} text-white shadow-xl`}>
          <button
            onClick={() =>
              setGlassStyle((prev) => (prev === "subtle" ? "clear" : prev === "clear" ? "medium" : "subtle"))
            }
            className="px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase bg-white/10 hover:bg-white/20 text-white/80 cursor-pointer"
            title="Toggle glass transparency"
          >
            {glassStyle} glass
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            title={isMinimized ? "Expand Panels" : "Minimize Panels"}
          >
            {isMinimized ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────
          MAIN CONTAINER: The 8 Transparent Glass-Morphism Panels
          ──────────────────────────────────────────────────────────── */}
      {!isMinimized && (
        <div className="flex-1 my-3 overflow-y-auto pr-1 pointer-events-auto max-w-7xl w-full mx-auto">
          {viewMode === "grid" ? (
            /* 8-PANEL RESPONSIVE GRID (Pure Transparent Glassmorphism) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Panel 1: Battery Health & Capacity */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Battery className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      1. Battery Health
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    SOH {sohPct}%
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/80">
                    <span>Current SOC:</span>
                    <span className="text-emerald-300 font-bold">{socPct}% ({availableEnergyKwh.toFixed(1)} kWh)</span>
                  </div>
                  {/* Visual 3-Zone Battery Bar */}
                  <div className="w-full h-3 rounded-full bg-black/40 border border-white/15 overflow-hidden flex">
                    <div style={{ width: `${safetyReservePct}%` }} className="h-full bg-amber-500/80" title="Locked Reserve" />
                    <div style={{ width: `${Math.max(0, socPct - safetyReservePct)}%` }} className="h-full bg-emerald-400" title="Available Energy" />
                    <div style={{ width: `${100 - socPct}%` }} className="h-full bg-transparent" />
                  </div>
                  <div className="flex justify-between text-[10px] text-white/50">
                    <span>Reserve: {lockedReserveKwh.toFixed(1)} kWh</span>
                    <span>True Usable: {trueUsableKwh.toFixed(1)} kWh</span>
                  </div>
                  <div className="pt-1 border-t border-white/10 flex justify-between text-[11px]">
                    <span className="text-white/60">Safe Usable Range:</span>
                    <span className="text-white font-bold">{safeUsableRangeKm.toFixed(1)} km</span>
                  </div>
                </div>

                {/* Slider */}
                <div className="pt-1">
                  <div className="flex justify-between text-[10px] text-white/60 mb-0.5">
                    <span>Adjust SOC</span>
                    <span>{socPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={socPct}
                    onChange={(e) => setSocPct(Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1 bg-white/20 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Panel 2: Drive Dynamics & Speed Drag */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Gauge className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      2. Drive Dynamics
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    {speedKmh.toFixed(0)} km/h
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/80">
                    <span>Speed (v):</span>
                    <span className="text-cyan-300 font-bold">{liveTelemetry.speedMs.toFixed(1)} m/s</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Aero Drag Power:</span>
                    <span className="text-white font-bold">{liveTelemetry.pAeroKw.toFixed(1)} kW</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Inertial Load:</span>
                    <span className={`font-bold ${liveTelemetry.pInertialKw >= 0 ? "text-amber-300" : "text-emerald-300"}`}>
                      {liveTelemetry.pInertialKw.toFixed(1)} kW
                    </span>
                  </div>
                  <div className="pt-1 border-t border-white/10 flex justify-between text-[11px]">
                    <span className="text-white/60">Drivetrain Eff:</span>
                    <span className="text-emerald-300 font-bold">
                      {liveTelemetry.drivetrainEfficiencyPct.toFixed(1)}%
                      {accel > 1.2 && <span className="text-amber-400 text-[10px] ml-1">(-penalty)</span>}
                    </span>
                  </div>
                </div>

                {/* Speed Slider */}
                <div className="pt-1">
                  <div className="flex justify-between text-[10px] text-white/60 mb-0.5">
                    <span>Throttle / Speed</span>
                    <span>{speedKmh.toFixed(0)} km/h</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    value={speedKmh}
                    onChange={(e) => {
                      setIsAutoSim(false);
                      setSpeedKmh(Number(e.target.value));
                    }}
                    className="w-full accent-cyan-400 h-1 bg-white/20 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Panel 3: Regenerative Efficiency & Braking */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <BatteryCharging className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      3. Regen Efficiency
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    liveTelemetry.pRegenKw > 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                  }`}>
                    {liveTelemetry.pRegenKw > 0 ? "Harvesting" : "Coasting"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/80">
                    <span>Slope Grade:</span>
                    <span className="text-purple-300 font-bold">{gradeDegrees > 0 ? `+${gradeDegrees.toFixed(1)}` : gradeDegrees.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Regen Captured:</span>
                    <span className="text-emerald-400 font-bold">{liveTelemetry.pRegenKw.toFixed(1)} kW</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Max Limit (2.2m/s²):</span>
                    <span className="text-white/60 font-semibold">{liveTelemetry.isHardBraking ? "Exceeded (Friction)" : "Optimal"}</span>
                  </div>
                  <div className="pt-1 border-t border-white/10 flex justify-between text-[11px]">
                    <span className="text-white/60">Downhill Gravity Gen:</span>
                    <span className="text-emerald-300 font-bold">80% capped</span>
                  </div>
                </div>

                {/* Grade Slider */}
                <div className="pt-1">
                  <div className="flex justify-between text-[10px] text-white/60 mb-0.5">
                    <span>Incline / Decline</span>
                    <span>{gradeDegrees.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.5"
                    value={gradeDegrees}
                    onChange={(e) => {
                      setIsAutoSim(false);
                      setGradeDegrees(Number(e.target.value));
                    }}
                    className="w-full accent-emerald-400 h-1 bg-white/20 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Panel 4: HVAC & Thermal Load */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Thermometer className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      4. HVAC &amp; Thermals
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {hvacKw.toFixed(1)} kW
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/80">
                    <span>Ambient vs Cabin:</span>
                    <span className="text-white font-bold">{ambientTempC}°C → {targetCabinTempC}°C</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Thermal Delta (ΔT):</span>
                    <span className="text-amber-300 font-bold">{deltaT}°C</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Eco Seat Heat:</span>
                    <button
                      onClick={() => setEcoSeatHeater(!ecoSeatHeater)}
                      className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                        ecoSeatHeater ? "bg-emerald-500/30 text-emerald-200" : "bg-white/10 text-white/50"
                      }`}
                    >
                      {ecoSeatHeater ? "Active (-0.7kW)" : "Off"}
                    </button>
                  </div>
                  <div className="pt-1 border-t border-white/10 flex justify-between text-[11px]">
                    <span className="text-white/60">Air Density (ρ):</span>
                    <span className="text-cyan-300 font-bold">{(1.225 * (288.15 / (273.15 + ambientTempC))).toFixed(3)} kg/m³</span>
                  </div>
                </div>

                {/* Ambient Temp Slider */}
                <div className="pt-1">
                  <div className="flex justify-between text-[10px] text-white/60 mb-0.5">
                    <span>Ambient Temp</span>
                    <span>{ambientTempC}°C</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max="38"
                    value={ambientTempC}
                    onChange={(e) => setAmbientTempC(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1 bg-white/20 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Panel 5: Route Planner & Range Forecast */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Navigation className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      5. Route Forecast
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    routeResult.tripStatus.includes("Safe")
                      ? "bg-emerald-500/20 text-emerald-300"
                      : routeResult.tripStatus.includes("Caution")
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}>
                    {routeResult.tripStatus.split(" ")[1]}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/80">
                    <span>Distance &amp; Time:</span>
                    <span className="text-white font-bold">{routeDistKm} km ({routeResult.estHours}h {routeResult.estMinutes}m)</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Expected Arrival:</span>
                    <span className={`font-bold ${routeResult.expectedArrivalSocPct >= safetyReservePct ? "text-emerald-400" : "text-rose-400"}`}>
                      {routeResult.expectedArrivalSocPct}% SOC
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Safety Reserve:</span>
                    <span className="text-amber-300 font-bold">{safetyReservePct}%</span>
                  </div>
                  <div className="pt-1 border-t border-white/10 flex justify-between text-[11px]">
                    <span className="text-white/60">Net Trip Energy:</span>
                    <span className="text-indigo-300 font-bold">{routeResult.totalTripKwh.toFixed(1)} kWh</span>
                  </div>
                </div>

                {/* Distance Slider */}
                <div className="pt-1">
                  <div className="flex justify-between text-[10px] text-white/60 mb-0.5">
                    <span>Route Distance</span>
                    <span>{routeDistKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="350"
                    value={routeDistKm}
                    onChange={(e) => setRouteDistKm(Number(e.target.value))}
                    className="w-full accent-indigo-400 h-1 bg-white/20 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Panel 6: Tire Pressure & Road Surface */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      6. Tires &amp; Surface
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                    Crr {surfaceCrr.toFixed(4)}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {/* 4 Tire Visual Grid */}
                  <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-black/30 text-[11px]">
                    <div className="flex justify-between px-2 py-1 bg-white/5 rounded">
                      <span className="text-white/50">FL:</span>
                      <span className="text-emerald-300 font-bold">{tireFL} PSI</span>
                    </div>
                    <div className="flex justify-between px-2 py-1 bg-white/5 rounded">
                      <span className="text-white/50">FR:</span>
                      <span className="text-emerald-300 font-bold">{tireFR} PSI</span>
                    </div>
                    <div className="flex justify-between px-2 py-1 bg-white/5 rounded">
                      <span className="text-white/50">RL:</span>
                      <span className="text-emerald-300 font-bold">{tireRL} PSI</span>
                    </div>
                    <div className="flex justify-between px-2 py-1 bg-white/5 rounded">
                      <span className="text-white/50">RR:</span>
                      <span className="text-emerald-300 font-bold">{tireRR} PSI</span>
                    </div>
                  </div>

                  {/* Surface selector */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {(["Dry", "Wet Rain", "Snow / Ice"] as const).map((surf) => (
                      <button
                        key={surf}
                        onClick={() => setRoadSurface(surf)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-sans font-medium transition cursor-pointer ${
                          roadSurface === surf
                            ? "bg-blue-500/30 text-blue-200 border border-blue-400/40"
                            : "bg-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        {surf === "Dry" ? "☀️ Dry" : surf === "Wet Rain" ? "🌧️ Wet" : "❄️ Snow"}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-white/10 flex justify-between text-[11px]">
                    <span className="text-white/60">Rolling Power:</span>
                    <span className="text-white font-bold">{liveTelemetry.pRollingKw.toFixed(2)} kW</span>
                  </div>
                </div>

                {/* Tire PSI Quick Adjuster */}
                <div className="pt-1">
                  <div className="flex justify-between text-[10px] text-white/60 mb-0.5">
                    <span>Tire Pressure</span>
                    <span>{avgPsi.toFixed(0)} PSI</span>
                  </div>
                  <input
                    type="range"
                    min="28"
                    max="44"
                    value={tireFL}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setTireFL(v);
                      setTireFR(v);
                      setTireRL(v + 1);
                      setTireRR(v + 1);
                    }}
                    className="w-full accent-blue-400 h-1 bg-white/20 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Panel 7: Payload Distribution & Mass */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Car className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      7. Payload &amp; Mass
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                    {totalMassKg} kg
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/80">
                    <span>Base Curb Weight:</span>
                    <span className="text-white/60">{baseMassKg} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Passengers ({passengersCount}):</span>
                    <span className="text-rose-300 font-bold">+{passengersCount * 75} kg</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Cargo Trunk:</span>
                    <span className="text-rose-300 font-bold">+{cargoKg} kg</span>
                  </div>
                  {/* Axle weight balance */}
                  <div className="pt-1 border-t border-white/10 flex justify-between text-[11px]">
                    <span className="text-white/60">Axle Distribution:</span>
                    <span className="text-white font-bold">{frontWeightPct}% F / {rearWeightPct}% R</span>
                  </div>
                </div>

                {/* Passenger Selector */}
                <div className="pt-1 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-white/60">
                    <span>Passengers:</span>
                    <span>{passengersCount} people</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        onClick={() => setPassengersCount(cnt)}
                        className={`flex-1 py-1 rounded-md text-[10px] font-mono transition cursor-pointer ${
                          passengersCount === cnt
                            ? "bg-rose-500/30 text-rose-200 border border-rose-400/40"
                            : "bg-white/5 text-white/60"
                        }`}
                      >
                        {cnt}P
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel 8: Diagnostics & Energy Flow */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      8. Energy Flow
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    liveTelemetry.isCharging ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {liveTelemetry.isCharging ? "Regen" : "Discharge"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-white/80">
                    <span>Wheel Mechanical:</span>
                    <span className="text-white font-bold">{liveTelemetry.pWheelsKw.toFixed(1)} kW</span>
                  </div>
                  <div className="flex justify-between items-center text-white/80">
                    <span>Aux / HVAC Idle:</span>
                    <span className="text-white/60">{hvacKw.toFixed(1)} kW</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                    <span className="text-white/80 font-semibold text-[11px]">Net Battery Draw:</span>
                    <span className={`text-base font-bold ${liveTelemetry.isCharging ? "text-emerald-400" : "text-amber-300"}`}>
                      {liveTelemetry.isCharging ? `${liveTelemetry.pBattKw.toFixed(1)}` : `+${liveTelemetry.pBattKw.toFixed(1)}`} kW
                    </span>
                  </div>
                  <div className="pt-1 flex justify-between text-[11px] text-white/60">
                    <span>Avg Efficiency:</span>
                    <span className="text-emerald-300 font-bold">~150 Wh/km</span>
                  </div>
                </div>

                {/* 1-Click Copy Dashboard */}
                <div className="pt-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(liveTelemetry.dashboardUITemplate);
                      setCopiedAscii(true);
                      setTimeout(() => setCopiedAscii(false), 2000);
                    }}
                    className="w-full py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedAscii ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAscii ? "Copied Dashboard" : "Copy Live Dashboard UI"}</span>
                  </button>
                </div>
              </div>

              {/* Panel 9: Google Maps EV Routes (Card in Grid) */}
              <div className={`p-4 rounded-2xl ${glassCard} shadow-xl flex flex-col justify-between space-y-3 md:col-span-2 lg:col-span-4`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                      9. Google Maps EV Multi-Route Optimizer
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    2 to 4 Routes · Best EV Route Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-black/35 border border-white/10 space-y-1">
                    <span className="text-white/50 text-[10px] block uppercase">Route 1 (Eco-Regen Valley)</span>
                    <span className="text-emerald-300 font-bold text-sm block">★ Best EV Choice</span>
                    <span className="text-white/70 text-[11px] block">168 km · 26.4 kWh · +4.8 kWh regen</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/35 border border-white/10 space-y-1">
                    <span className="text-white/50 text-[10px] block uppercase">Route 2 (Interstate 80)</span>
                    <span className="text-cyan-300 font-bold text-sm block">Fastest Speed</span>
                    <span className="text-white/70 text-[11px] block">184 km · 36.8 kWh (v³ drag penalty)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/35 border border-white/10 flex flex-col justify-between">
                    <div>
                      <span className="text-white/50 text-[10px] block uppercase">Live Google Map API</span>
                      <span className="text-white font-bold text-xs block">VITE_GOOGLE_MAPS_API_KEY</span>
                    </div>
                    <button
                      onClick={() => {
                        setFocusedModule(9);
                        setViewMode("single");
                      }}
                      className="mt-2 w-full py-1.5 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/40 text-emerald-200 text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Open Interactive Map (Focus) →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SINGLE MODULE FOCUS VIEW */
            <div className={`p-6 rounded-3xl ${glassCard} ${focusedModule === 9 ? "max-w-6xl" : "max-w-2xl"} mx-auto shadow-2xl space-y-4`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    Module {focusedModule} of 9:
                  </span>
                  <span className="text-base font-semibold text-white">
                    {focusedModule === 1 && "Battery Health & Capacity SOH"}
                    {focusedModule === 2 && "Drive Dynamics & Aerodynamic Drag"}
                    {focusedModule === 3 && "Regenerative Braking & Incline Grade"}
                    {focusedModule === 4 && "Cabin HVAC & Ambient Thermals"}
                    {focusedModule === 5 && "Route Energy & Safety Reserve Planner"}
                    {focusedModule === 6 && "Tire Pressures & Road Surface Friction"}
                    {focusedModule === 7 && "Payload Weight & Axle Distribution"}
                    {focusedModule === 8 && "System Diagnostics & Live Power Flow"}
                    {focusedModule === 9 && "Google Maps EV Multi-Route Optimizer"}
                  </span>
                </div>
                <span className="text-xs font-mono text-white/50">Focus View</span>
              </div>

              {/* Module Content */}
              {focusedModule === 1 && (
                <div className="space-y-4 text-xs font-mono text-white/90">
                  <p className="text-white/70 leading-relaxed font-sans text-sm">
                    Evaluates true usable battery pack energy factoring in cell State-of-Health (SOH), hardware cell buffers, and locked emergency reserves.
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-sm">
                    <div>Nominal Pack: <span className="font-bold text-white">{nominalKwh} kWh</span></div>
                    <div>Usable Buffer: <span className="font-bold text-emerald-300">{hardwareBufferPct}%</span></div>
                    <div>State of Health: <span className="font-bold text-emerald-300">{sohPct}%</span></div>
                    <div>Locked Reserve: <span className="font-bold text-amber-300">{lockedReserveKwh.toFixed(1)} kWh ({safetyReservePct}%)</span></div>
                    <div>Available Energy: <span className="font-bold text-white">{availableEnergyKwh.toFixed(1)} kWh</span></div>
                    <div>Safe Range: <span className="font-bold text-emerald-400">{safeUsableRangeKm.toFixed(1)} km</span></div>
                  </div>
                </div>
              )}

              {focusedModule === 2 && (
                <div className="space-y-4 text-xs font-mono text-white/90">
                  <p className="text-white/70 leading-relaxed font-sans text-sm">
                    Calculates cubic aerodynamic resistance (P_aero ∝ v³) and inertial acceleration load. Aggressive throttle launches &gt; 1.2 m/s² incur drivetrain efficiency penalties.
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-sm">
                    <div>Speed: <span className="font-bold text-cyan-300">{speedKmh.toFixed(1)} km/h</span></div>
                    <div>Airspeed (v): <span className="font-bold text-white">{liveTelemetry.speedMs.toFixed(2)} m/s</span></div>
                    <div>Aero Power: <span className="font-bold text-white">{liveTelemetry.pAeroKw.toFixed(2)} kW</span></div>
                    <div>Inertial Power: <span className="font-bold text-amber-300">{liveTelemetry.pInertialKw.toFixed(2)} kW</span></div>
                    <div>Drivetrain Efficiency: <span className="font-bold text-emerald-400">{liveTelemetry.drivetrainEfficiencyPct.toFixed(1)}%</span></div>
                    <div>Total Wheel Power: <span className="font-bold text-white">{liveTelemetry.pWheelsKw.toFixed(2)} kW</span></div>
                  </div>
                </div>
              )}

              {focusedModule === 3 && (
                <div className="space-y-4 text-xs font-mono text-white/90">
                  <p className="text-white/70 leading-relaxed font-sans text-sm">
                    Models regenerative kinetic energy recovery on descents. Decelerations up to 2.2 m/s² achieve maximum regen capture; harder braking engages friction pads with energy dissipation.
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-sm">
                    <div>Road Grade: <span className="font-bold text-purple-300">{gradeDegrees}°</span></div>
                    <div>Elevation Regen Cap: <span className="font-bold text-emerald-300">80% efficiency</span></div>
                    <div>Regen Power: <span className="font-bold text-emerald-400">{liveTelemetry.pRegenKw.toFixed(2)} kW</span></div>
                    <div>Friction Loss Alert: <span className="font-bold text-white">{liveTelemetry.isHardBraking ? "Active" : "None (100% Regen)"}</span></div>
                  </div>
                </div>
              )}

              {focusedModule === 4 && (
                <div className="space-y-4 text-xs font-mono text-white/90">
                  <p className="text-white/70 leading-relaxed font-sans text-sm">
                    Thermodynamic HVAC cabin load modeling: 1.0 kW base draw plus 0.1 kW for every degree of temperature difference between ambient environment and cabin target.
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-sm">
                    <div>Ambient Temp: <span className="font-bold text-white">{ambientTempC}°C</span></div>
                    <div>Target Cabin: <span className="font-bold text-amber-300">{targetCabinTempC}°C</span></div>
                    <div>Thermal Delta (ΔT): <span className="font-bold text-white">{deltaT}°C</span></div>
                    <div>HVAC Auxiliary Load: <span className="font-bold text-amber-400">{hvacKw.toFixed(2)} kW</span></div>
                  </div>
                </div>
              )}

              {focusedModule === 5 && (
                <div className="space-y-4 text-xs font-mono text-white/90">
                  <p className="text-white/70 leading-relaxed font-sans text-sm">
                    8-constraint silent route optimization engine. Predicts expected arrival battery SOC and computes DC fast charge requirements if destination buffer drops below safety reserve.
                  </p>
                  <pre className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
{routeResult.asciiDashboard}
                  </pre>
                </div>
              )}

              {focusedModule === 6 && (
                <div className="space-y-4 text-xs font-mono text-white/90">
                  <p className="text-white/70 leading-relaxed font-sans text-sm">
                    Rolling resistance modeling: Tire pressures below 35 PSI and wet (+25%) or snow (+50%) road surfaces significantly degrade vehicle efficiency.
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-sm">
                    <div>Surface Type: <span className="font-bold text-blue-300">{roadSurface}</span></div>
                    <div>Crr Coefficient: <span className="font-bold text-white">{surfaceCrr.toFixed(4)}</span></div>
                    <div>Tire Pressure Avg: <span className="font-bold text-emerald-300">{avgPsi.toFixed(1)} PSI</span></div>
                    <div>Rolling Resistance: <span className="font-bold text-white">{liveTelemetry.pRollingKw.toFixed(2)} kW</span></div>
                  </div>
                </div>
              )}

              {focusedModule === 7 && (
                <div className="space-y-4 text-xs font-mono text-white/90">
                  <p className="text-white/70 leading-relaxed font-sans text-sm">
                    Dynamic mass payload and axle balance: Passenger and cargo mass increase both mechanical rolling resistance and gravitational elevation climb power.
                  </p>
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/40 border border-white/10 text-sm">
                    <div>Vehicle Curb Mass: <span className="font-bold text-white">{baseMassKg} kg</span></div>
                    <div>Total Live Mass: <span className="font-bold text-rose-300">{totalMassKg} kg</span></div>
                    <div>Axle Distribution: <span className="font-bold text-white">{frontWeightPct}% Front / {rearWeightPct}% Rear</span></div>
                    <div>Grade Elevation Cost: <span className="font-bold text-white">{liveTelemetry.pGradeKw.toFixed(2)} kW</span></div>
                  </div>
                </div>
              )}

              {focusedModule === 8 && (
                <div className="space-y-4 text-xs font-mono text-white/90">
                  <p className="text-white/70 leading-relaxed font-sans text-sm">
                    Complete energy balance telemetry and live OBD-II terminal interface.
                  </p>
                  <pre className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
{liveTelemetry.dashboardUITemplate}
                  </pre>
                </div>
              )}

              {focusedModule === 9 && (
                <div className="w-full">
                  <EVRouteMapModule
                    initialBatterySoc={socPct}
                    usablePackKwh={trueUsableKwh}
                  />
                </div>
              )}

              {/* Prev / Next Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <button
                  onClick={() => setFocusedModule((prev) => (prev > 1 ? prev - 1 : 9))}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer"
                >
                  ← Previous Module
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-medium cursor-pointer"
                >
                  View All in Grid
                </button>
                <button
                  onClick={() => setFocusedModule((prev) => (prev < 9 ? prev + 1 : 1))}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer"
                >
                  Next Module →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          BOTTOM DOCK: Sylva Living World 3D Variants & Zen Mode
          (Zero occlusion, floating over bottom of the 3D scene)
          ──────────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-center pointer-events-auto">
        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl ${glassCard} text-white shadow-2xl`}>
          {/* Living World 3D Variant Buttons */}
          {[
            { id: "living-green", label: "Living Green", color: "bg-emerald-400" },
            { id: "sakura-sunset", label: "Sakura Sunset", color: "bg-pink-400" },
            { id: "maple-autumn", label: "Maple Autumn", color: "bg-amber-500" },
            { id: "sequoia-mist", label: "Sequoia Mist", color: "bg-teal-400" },
          ].map((v) => {
            const isActive = currentVariant === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onVariantChange?.(v.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide transition cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-white/25 text-white shadow-sm border border-white/30"
                    : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${v.color}`} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            );
          })}

          <div className="w-px h-4 bg-white/20 mx-1" />

          {/* Quick minimize toggle */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              !isMinimized
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent"
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>{!isMinimized ? "Hide Panels" : "Show 8 Panels"}</span>
          </button>

          {onBackToHome && (
            <>
              <div className="w-px h-4 bg-white/20 mx-1" />
              <button
                onClick={onBackToHome}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer flex items-center gap-1.5"
                title="Return to Home Screen"
              >
                <Home className="w-3.5 h-3.5 text-emerald-400" />
                <span>Home</span>
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
