import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  calculateEVTelemetry,
  DEFAULT_EV_BASELINE,
  type EVTelemetryInput,
  type EVTelemetryResult,
  type EVVehicleBaseline,
} from "../physics/evTelemetry";
import {
  DRIVE_PROFILES,
  EV_VEHICLE_MODELS,
  type DriveProfileId,
  type EVVehicleModel,
} from "../physics/evSimulation";
import {
  optimizeEVRoute,
  DEFAULT_ROUTE_PAYLOAD,
  type RoutePlannerPayload,
  type RouteOptimizationResult,
} from "../physics/evRoutePlanner";
import {
  Gauge,
  Zap,
  BatteryCharging,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Wind,
  Layers,
  TrendingUp,
  Activity,
  Sliders,
  Car,
  Compass,
  Cpu,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface AutomatedEVTelemetryHUDProps {
  onVariantChange?: (variant: any) => void;
  currentVariant?: string;
}

export function AutomatedEVTelemetryHUD({
  onVariantChange,
  currentVariant = "living-green",
}: AutomatedEVTelemetryHUDProps) {
  // Automation State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [activeProfileId, setActiveProfileId] =
    useState<DriveProfileId>("mountain-pass");
  const [activeVehicleId, setActiveVehicleId] =
    useState<string>("sylva-standard");

  // Simulation time
  const [simTime, setSimTime] = useState<number>(0);
  const lastTickRef = useRef<number>(performance.now());
  const rafRef = useRef<number | null>(null);

  // Manual override option
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [manualSpeedKmh, setManualSpeedKmh] = useState<number>(100);
  const [manualTargetSpeedKmh, setManualTargetSpeedKmh] = useState<number>(100);
  const [manualAccel, setManualAccel] = useState<number>(1.5);
  const [manualGrade, setManualGrade] = useState<number>(2.0);
  const [manualAgg, setManualAgg] = useState<number>(1.5);

  // UI Panels state
  const [deckTab, setDeckTab] = useState<"route-planner" | "telemetry">("route-planner");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [glassOpacity, setGlassOpacity] = useState<"subtle" | "medium" | "clear">(
    "subtle"
  );
  const [copied, setCopied] = useState<boolean>(false);

  // Route & Energy Optimization State
  const [routePayload, setRoutePayload] = useState<RoutePlannerPayload>({
    ...DEFAULT_ROUTE_PAYLOAD,
  });

  const routeResult: RouteOptimizationResult = useMemo(() => {
    return optimizeEVRoute(routePayload);
  }, [routePayload]);

  // Current active profile & vehicle
  const currentProfile = useMemo(() => {
    return (
      DRIVE_PROFILES.find((p) => p.id === activeProfileId) || DRIVE_PROFILES[0]
    );
  }, [activeProfileId]);

  const currentVehicle = useMemo(() => {
    return (
      EV_VEHICLE_MODELS.find((v) => v.id === activeVehicleId) ||
      EV_VEHICLE_MODELS[0]
    );
  }, [activeVehicleId]);

  // Automated loop
  useEffect(() => {
    if (!isPlaying || isManualOverride) return;

    let localRafId: number;
    const tick = (now: number) => {
      const deltaSec = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      // Advance simulation time clamped
      setSimTime((prev) => prev + deltaSec * simSpeed);
      localRafId = requestAnimationFrame(tick);
    };

    lastTickRef.current = performance.now();
    localRafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(localRafId);
  }, [isPlaying, simSpeed, isManualOverride]);

  // Telemetry computation from automation or manual
  const automatedState = useMemo(() => {
    return currentProfile.generateTelemetry(simTime);
  }, [currentProfile, simTime]);

  const currentTelemetryInput: EVTelemetryInput = useMemo(() => {
    if (isManualOverride) {
      return {
        speedKmh: manualSpeedKmh,
        targetSpeedKmh: manualTargetSpeedKmh,
        accel: manualAccel,
        gradeDegrees: manualGrade,
        aggressiveness: manualAgg,
      };
    }
    return {
      speedKmh: automatedState.speedKmh,
      targetSpeedKmh: automatedState.targetSpeedKmh,
      accel: automatedState.accel,
      gradeDegrees: automatedState.gradeDegrees,
      aggressiveness: automatedState.aggressiveness,
      trafficAdjust: automatedState.trafficAdjust,
    };
  }, [isManualOverride, manualSpeedKmh, manualTargetSpeedKmh, manualAccel, manualGrade, manualAgg, automatedState]);

  // Calculate live physics metrics
  const telemetryResult: EVTelemetryResult = useMemo(() => {
    return calculateEVTelemetry(currentTelemetryInput, currentVehicle.baseline);
  }, [currentTelemetryInput, currentVehicle]);

  const handleCopyFormatted = () => {
    navigator.clipboard.writeText(telemetryResult.formattedTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Glass background styling classes
  const glassStyle = useMemo(() => {
    switch (glassOpacity) {
      case "clear":
        return "bg-black/20 backdrop-blur-sm border-white/10";
      case "subtle":
        return "bg-black/35 backdrop-blur-md border-white/15";
      case "medium":
      default:
        return "bg-black/50 backdrop-blur-lg border-white/20";
    }
  }, [glassOpacity]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 select-none font-sans overflow-hidden">
      {/* ────────────────────────────────────────────────────────────
          TOP COCKPIT BAR: Live HUD, Status & Automation Controls
          (Transparent floating strip over Sylva living world)
          ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Brand & EV Vehicle Identity */}
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-2xl ${glassStyle} border text-white shadow-xl transition-all`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase font-mono text-emerald-400">
              EV Autopilot
            </span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          {/* Vehicle Model Selector */}
          <div className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={activeVehicleId}
              onChange={(e) => setActiveVehicleId(e.target.value)}
              className="bg-transparent text-xs font-medium text-white/90 border-0 focus:ring-0 cursor-pointer pr-1"
            >
              {EV_VEHICLE_MODELS.map((vm) => (
                <option key={vm.id} value={vm.id} className="bg-zinc-900 text-white">
                  {vm.name} ({vm.baseline.mass}kg · Cd {vm.baseline.Cd})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Center Telemetry Gauge Pills */}
        <div
          className={`flex items-center gap-3 sm:gap-6 px-4 py-2 rounded-2xl ${glassStyle} border text-white shadow-xl`}
        >
          {/* Speed Indicator */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase font-mono text-white/50">Speed</span>
            <span className="text-lg font-bold font-mono tracking-tight text-white">
              {telemetryResult.speedKmh.toFixed(1)}
            </span>
            <span className="text-[11px] text-white/60 font-mono">km/h</span>
            <span className="text-[10px] text-emerald-400 font-mono">
              ({telemetryResult.speedMs.toFixed(1)} m/s)
            </span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          {/* Acceleration Indicator */}
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-[10px] uppercase text-white/50">Accel</span>
            <span
              className={`text-sm font-bold ${
                telemetryResult.accel < 0
                  ? telemetryResult.accel < -2.2
                    ? "text-rose-400"
                    : "text-emerald-400"
                  : telemetryResult.accel > 1.2
                  ? "text-amber-400"
                  : "text-white"
              }`}
            >
              {telemetryResult.accel >= 0
                ? `+${telemetryResult.accel.toFixed(2)}`
                : telemetryResult.accel.toFixed(2)}
            </span>
            <span className="text-[10px] text-white/50">m/s²</span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          {/* Road Grade Indicator */}
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-[10px] uppercase text-white/50">Grade</span>
            <span
              className={`text-sm font-bold ${
                telemetryResult.gradeDegrees > 0
                  ? "text-cyan-300"
                  : telemetryResult.gradeDegrees < 0
                  ? "text-emerald-300"
                  : "text-white"
              }`}
            >
              {telemetryResult.gradeDegrees >= 0
                ? `+${telemetryResult.gradeDegrees.toFixed(1)}°`
                : `${telemetryResult.gradeDegrees.toFixed(1)}°`}
            </span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          {/* Net Battery Draw Flow */}
          <div className="flex items-center gap-2 font-mono">
            {telemetryResult.isCharging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <Zap className="w-4 h-4 text-amber-400" />
            )}
            <div className="flex items-baseline gap-1">
              <span
                className={`text-base font-bold ${
                  telemetryResult.isCharging ? "text-emerald-400" : "text-amber-300"
                }`}
              >
                {telemetryResult.isCharging
                  ? `${telemetryResult.pBattKw.toFixed(1)}`
                  : `+${telemetryResult.pBattKw.toFixed(1)}`}
              </span>
              <span className="text-[10px] text-white/60">kW</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-sans uppercase font-semibold ${
                  telemetryResult.isCharging
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {telemetryResult.isCharging ? "Regen" : "Discharge"}
              </span>
            </div>
          </div>
        </div>

        {/* Automation Controls & Transparency Toggles */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl ${glassStyle} border text-white shadow-xl`}
        >
          {/* Play / Pause Autopilot */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause Autopilot" : "Resume Autopilot"}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-amber-400" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            )}
          </button>

          {/* Sim Speed Multiplier */}
          <button
            onClick={() => {
              setSimSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 5 : 1));
            }}
            title="Simulation Speed"
            className="px-2 py-0.5 rounded-lg text-xs font-mono bg-white/10 hover:bg-white/20 transition cursor-pointer text-white/90"
          >
            {simSpeed}x
          </button>

          {/* Reset Clock */}
          <button
            onClick={() => setSimTime(0)}
            title="Restart Drive Cycle"
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-white/15" />

          {/* Transparency Glass Mode */}
          <button
            onClick={() => {
              setGlassOpacity((prev) =>
                prev === "subtle" ? "clear" : prev === "clear" ? "medium" : "subtle"
              );
            }}
            title={`Glass Transparency: ${glassOpacity}`}
            className="px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase bg-white/10 hover:bg-white/20 transition cursor-pointer text-white/80"
          >
            {glassOpacity} glass
          </button>

          {/* Minimize / Maximize Details */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Minimize HUD" : "Expand Telemetry Details"}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────
          MIDDLE FLOATING OVERLAYS: Automated Drive Phase Pill & Detailed Physics
          ──────────────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="flex-1 flex flex-col justify-end max-w-4xl w-full mx-auto my-3 pointer-events-auto space-y-3">
          {/* Deck Tab Switcher */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1.5 p-1 rounded-2xl ${glassStyle} border`}>
              <button
                onClick={() => setDeckTab("route-planner")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer flex items-center gap-1.5 ${
                  deckTab === "route-planner"
                    ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
              >
                <span>🛣️</span>
                <span>EV Route &amp; Energy Planner</span>
              </button>
              <button
                onClick={() => setDeckTab("telemetry")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer flex items-center gap-1.5 ${
                  deckTab === "telemetry"
                    ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
              >
                <span>⚡</span>
                <span>Live Drive Telemetry</span>
              </button>
            </div>

            {deckTab === "route-planner" && (
              <span className={`text-[10px] font-mono px-3 py-1 rounded-full ${glassStyle} border text-emerald-300`}>
                8-Constraint Silent Physics
              </span>
            )}
          </div>

          {/* ROUTE & ENERGY PLANNER VIEW */}
          {deckTab === "route-planner" ? (
            <div className="space-y-3">
              {/* Route Presets Bar */}
              <div className={`p-3 rounded-2xl ${glassStyle} border flex flex-wrap items-center justify-between gap-2 text-xs text-white`}>
                <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                  Scenario Presets:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() =>
                      setRoutePayload({
                        ...routePayload,
                        route: { distanceKm: 185, elevationChangeM: 650, trafficLevel: "Moderate", speedKmh: 95 },
                        environment: { tempC: 8, weather: "Rain / Wet", windKmh: 15 },
                        vehicle: { ...routePayload.vehicle, currentSocPct: 78 },
                        settings: { safetyReservePct: 10, targetCabinTempC: 21 },
                      })
                    }
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer text-[11px]"
                  >
                    ⛰️ Alpine Pass (185km)
                  </button>
                  <button
                    onClick={() =>
                      setRoutePayload({
                        ...routePayload,
                        route: { distanceKm: 240, elevationChangeM: -100, trafficLevel: "Low", speedKmh: 110 },
                        environment: { tempC: 19, weather: "Clear", windKmh: -5 },
                        vehicle: { ...routePayload.vehicle, currentSocPct: 85 },
                        settings: { safetyReservePct: 8, targetCabinTempC: 22 },
                      })
                    }
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer text-[11px]"
                  >
                    🌊 Coastal Highway (240km)
                  </button>
                  <button
                    onClick={() =>
                      setRoutePayload({
                        ...routePayload,
                        route: { distanceKm: 95, elevationChangeM: 120, trafficLevel: "Moderate", speedKmh: 80 },
                        environment: { tempC: -4, weather: "Snow / Ice", windKmh: 20 },
                        vehicle: { ...routePayload.vehicle, currentSocPct: 52 },
                        settings: { safetyReservePct: 12, targetCabinTempC: 22 },
                      })
                    }
                    className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer text-[11px]"
                  >
                    ❄️ Winter Commute (95km)
                  </button>
                  <button
                    onClick={() =>
                      setRoutePayload({
                        ...routePayload,
                        route: { distanceKm: 340, elevationChangeM: 400, trafficLevel: "Heavy", speedKmh: 90 },
                        environment: { tempC: 5, weather: "Rain / Wet", windKmh: 25 },
                        vehicle: { ...routePayload.vehicle, currentSocPct: 45 },
                        settings: { safetyReservePct: 10, targetCabinTempC: 21 },
                      })
                    }
                    className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition cursor-pointer text-[11px]"
                  >
                    ⚠️ Low Battery (340km)
                  </button>
                </div>
              </div>

              {/* Exact ASCII Dashboard Output (Transparent) */}
              <div className={`p-4 rounded-2xl ${glassStyle} border text-white shadow-2xl space-y-3`}>
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">🛣️</span>
                    <span className="text-xs font-semibold uppercase font-mono tracking-wider text-white">
                      Actionable Driver Output
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                      routeResult.tripStatus.includes("Safe")
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : routeResult.tripStatus.includes("Caution")
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      {routeResult.tripStatus}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(routeResult.asciiDashboard);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-mono transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied Output" : "Copy Dashboard UI"}</span>
                  </button>
                </div>

                {/* Rendered ASCII / Dashboard Template */}
                <pre className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
{routeResult.asciiDashboard}
                </pre>
              </div>
            </div>
          ) : (
            /* TELEMETRY VIEW */
            <>
              {/* Active Autopilot Driving Phase Banner */}
              <div
                className={`px-4 py-2.5 rounded-2xl ${glassStyle} border flex items-center justify-between text-white shadow-xl transition-all`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ backgroundColor: currentProfile.color }}
                  />
                  <div>
                    <div className="text-xs font-semibold tracking-wide flex items-center gap-2">
                      <span>{automatedState.phaseTitle}</span>
                      <span className="text-[10px] font-mono text-white/40">
                        Cycle T+{(simTime % currentProfile.durationSeconds).toFixed(1)}s /{" "}
                        {currentProfile.durationSeconds}s
                      </span>
                    </div>
                    <div className="text-[11px] text-white/70">
                      {automatedState.phaseDescription}
                    </div>
                  </div>
                </div>

                {/* Quick Profile Tabs */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {DRIVE_PROFILES.map((dp) => (
                    <button
                      key={dp.id}
                      onClick={() => {
                        setActiveProfileId(dp.id);
                        setSimTime(0);
                        setIsManualOverride(false);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition cursor-pointer ${
                        activeProfileId === dp.id && !isManualOverride
                          ? "bg-white/25 text-white shadow-sm border border-white/30"
                          : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
                      }`}
                    >
                      {dp.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsManualOverride(!isManualOverride)}
                    className={`px-2 py-1 rounded-xl text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                      isManualOverride
                        ? "bg-amber-500/30 text-amber-200 border border-amber-400/40"
                        : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
                    }`}
                    title="Manual slider mode"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Manual</span>
                  </button>
                </div>
              </div>


          {/* Manual Sliders Bar if user enables Manual Override */}
          {isManualOverride && (
            <div
              className={`p-3.5 rounded-2xl ${glassStyle} border grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs text-white`}
            >
              <div>
                <div className="flex justify-between text-[11px] text-white/70 mb-1">
                  <span>Speed</span>
                  <span className="font-mono text-emerald-400">{manualSpeedKmh} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={manualSpeedKmh}
                  onChange={(e) => setManualSpeedKmh(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1 bg-white/20 rounded"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-white/70 mb-1">
                  <span>Target</span>
                  <span className="font-mono text-cyan-400">{manualTargetSpeedKmh} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={manualTargetSpeedKmh}
                  onChange={(e) => setManualTargetSpeedKmh(Number(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-white/20 rounded"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-white/70 mb-1">
                  <span>Accel</span>
                  <span className="font-mono text-amber-400">{manualAccel} m/s²</span>
                </div>
                <input
                  type="range"
                  min="-3.5"
                  max="3.5"
                  step="0.1"
                  value={manualAccel}
                  onChange={(e) => setManualAccel(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-white/20 rounded"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-white/70 mb-1">
                  <span>Grade</span>
                  <span className="font-mono text-purple-400">{manualGrade}°</span>
                </div>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={manualGrade}
                  onChange={(e) => setManualGrade(Number(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-white/20 rounded"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-white/70 mb-1">
                  <span>Aggressiveness</span>
                  <span className="font-mono text-rose-400">{manualAgg}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.05"
                  value={manualAgg}
                  onChange={(e) => setManualAgg(Number(e.target.value))}
                  className="w-full accent-rose-500 h-1 bg-white/20 rounded"
                />
              </div>
            </div>
          )}

          {/* Three-Column Transparent Telemetry Deck */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Conversions & Target Speed Card */}
            <div
              className={`p-3.5 rounded-2xl ${glassStyle} border text-white shadow-xl flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-semibold uppercase font-mono tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  1. Speed &amp; Target
                </span>
                <span className="text-[10px] text-white/50 font-mono">v = km/h ÷ 3.6</span>
              </div>

              <div className="space-y-2 py-2 text-xs font-mono">
                <div className="flex justify-between items-center bg-white/5 px-2.5 py-1.5 rounded-xl">
                  <span className="text-white/60">Speed (v):</span>
                  <span className="font-bold text-white">
                    {telemetryResult.speedMs.toFixed(2)} m/s{" "}
                    <span className="text-white/40 font-normal">
                      ({telemetryResult.speedKmh.toFixed(1)} km/h)
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center bg-white/5 px-2.5 py-1.5 rounded-xl">
                  <span className="text-white/60">Target Speed:</span>
                  <span className="text-cyan-300 font-semibold">
                    {telemetryResult.targetSpeedMs.toFixed(2)} m/s{" "}
                    <span className="text-white/40 font-normal">
                      ({telemetryResult.targetSpeedKmh.toFixed(1)} km/h)
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center px-1 text-[11px] text-white/50">
                  <span>Traffic model:</span>
                  <span className="text-white/70">
                    min(v_limit, v_traffic×(1-var), v_curve)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Component Calculations Card */}
            <div
              className={`p-3.5 rounded-2xl ${glassStyle} border text-white shadow-xl flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-semibold uppercase font-mono tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  2. Wheel Power Parts
                </span>
                <span className="text-[10px] text-white/50 font-mono">P_wheels (kW)</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 py-2 text-[11px] font-mono">
                <div className="bg-white/5 p-1.5 rounded-xl">
                  <span className="text-white/50 block text-[10px]">Aero Drag</span>
                  <span className="text-sm font-semibold text-white">
                    {telemetryResult.pAeroKw.toFixed(2)} kW
                  </span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-xl">
                  <span className="text-white/50 block text-[10px]">Rolling (Crr)</span>
                  <span className="text-sm font-semibold text-white">
                    {telemetryResult.pRollingKw.toFixed(2)} kW
                  </span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-xl">
                  <span className="text-white/50 block text-[10px]">Grade Slope</span>
                  <span
                    className={`text-sm font-semibold ${
                      telemetryResult.pGradeKw > 0
                        ? "text-purple-300"
                        : telemetryResult.pGradeKw < 0
                        ? "text-emerald-300"
                        : "text-white"
                    }`}
                  >
                    {telemetryResult.pGradeKw.toFixed(2)} kW
                  </span>
                </div>
                <div className="bg-white/5 p-1.5 rounded-xl">
                  <span className="text-white/50 block text-[10px]">Inertial (m·a)</span>
                  <span
                    className={`text-sm font-semibold ${
                      telemetryResult.pInertialKw >= 0
                        ? "text-amber-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {telemetryResult.pInertialKw.toFixed(2)} kW
                  </span>
                </div>
              </div>

              <div className="pt-1 flex justify-between items-center text-xs font-mono border-t border-white/10">
                <span className="text-white/60">Total Wheel Power:</span>
                <span className="font-bold text-white">
                  {telemetryResult.pWheelsKw.toFixed(2)} kW
                </span>
              </div>
            </div>

            {/* 3. Net Battery Impact Card */}
            <div
              className={`p-3.5 rounded-2xl ${glassStyle} border text-white shadow-xl flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-semibold uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  3. Net Battery Impact
                </span>
                <button
                  onClick={handleCopyFormatted}
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono transition cursor-pointer"
                  title="Copy telemetry template"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5 py-1.5 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Drivetrain Eff:</span>
                  <span className="text-emerald-300 font-semibold">
                    {telemetryResult.drivetrainEfficiencyPct.toFixed(1)}%
                    {telemetryResult.accel > 1.2 && (
                      <span className="text-[10px] ml-1 text-amber-400 font-normal">
                        (penalty)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-white/60">Regen Captured:</span>
                  <span
                    className={`font-semibold ${
                      telemetryResult.pRegenKw > 0
                        ? "text-emerald-400"
                        : "text-white/50"
                    }`}
                  >
                    {telemetryResult.pRegenKw.toFixed(2)} kW
                    {telemetryResult.isHardBraking && (
                      <span className="text-[10px] ml-1 text-rose-400 font-normal">
                        (friction loss)
                      </span>
                    )}
                  </span>
                </div>

                {/* Battery Net Power Box */}
                <div
                  className={`px-3 py-2 rounded-xl flex items-center justify-between border mt-1 ${
                    telemetryResult.isCharging
                      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                      : "bg-amber-500/20 border-amber-400/40 text-amber-200"
                  }`}
                >
                  <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-white/80">
                    Net Battery Draw
                  </span>
                  <span className="text-sm font-bold font-mono text-white">
                    {telemetryResult.pBattKw.toFixed(2)} kW
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-white/40 font-mono text-right pt-0.5">
                {telemetryResult.isCharging
                  ? "Negative = Charging high-voltage pack"
                  : "Positive = Draining battery pack (1.2kW idle included)"}
              </div>
            </div>
          </div>

          {/* ⚡ Live EV Dashboard Formatted Card (Pure Transparency) */}
          <div className={`p-4 rounded-2xl ${glassStyle} border text-white shadow-2xl space-y-3`}>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">⚡</span>
                <span className="text-xs font-semibold uppercase font-mono tracking-wider text-white">
                  Automated Digital Dashboard Interface
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  OBD-II Live Feed
                </span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(telemetryResult.dashboardUITemplate);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 text-xs font-mono transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied Dashboard" : "Copy Live Dashboard UI"}</span>
              </button>
            </div>

            {/* Rendered ASCII / Exact Terminal Dashboard */}
            <pre className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
{telemetryResult.dashboardUITemplate}
            </pre>
          </div>
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          BOTTOM DOCK: Living World Variant Selector & Transparency Toggles
          (Zero occlusion, floating over bottom of the 3D scene)
          ──────────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-center pointer-events-auto">
        <div
          className={`flex items-center gap-1.5 p-1.5 rounded-2xl ${glassStyle} border text-white shadow-2xl`}
        >
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

          {/* Quick HUD toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              isExpanded
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent"
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExpanded ? "Hide Deck" : "Show Deck"}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export const DriveSpeedSection = AutomatedEVTelemetryHUD;
export default AutomatedEVTelemetryHUD;
