import React from "react";
import {
  Battery,
  Gauge,
  BatteryCharging,
  Thermometer,
  Navigation,
  Activity,
  Car,
  Zap,
  Play,
  ArrowRight,
  Eye,
  Sparkles,
  ShieldCheck,
  Compass,
  Layers,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { SYLVA_LIVING_WORLD_VARIANTS, type SylvaLivingWorldVariant } from "@designcodeio/threeui";

export interface HomeScreenProps {
  currentVariant: SylvaLivingWorldVariant;
  onVariantChange: (variant: SylvaLivingWorldVariant) => void;
  onLaunchCockpit: (initialModule?: number) => void;
  onExploreBiome: () => void;
}

export function HomeScreen({
  currentVariant,
  onVariantChange,
  onLaunchCockpit,
  onExploreBiome,
}: HomeScreenProps) {
  const variantLabels: Record<SylvaLivingWorldVariant, { label: string; color: string; desc: string }> = {
    "living-green": {
      label: "Living Green",
      color: "bg-emerald-400",
      desc: "Original moss-root forest world in deep twilight",
    },
    "sakura-sunset": {
      label: "Sakura Sunset",
      color: "bg-pink-400",
      desc: "Pink blossom petals tumbling in warm sunset light",
    },
    "maple-autumn": {
      label: "Maple Autumn",
      color: "bg-amber-500",
      desc: "Palmate golden maple leaves in cool dusk",
    },
    "sequoia-mist": {
      label: "Sequoia Mist",
      color: "bg-teal-400",
      desc: "Conifer needle sprays through mountain grove fog",
    },
  };

  const modules = [
    {
      id: 1,
      title: "Battery Health",
      desc: "82 kWh pack, 96% SOH, locked reserve buffer",
      icon: Battery,
      color: "text-emerald-400",
      badge: "82 kWh",
    },
    {
      id: 2,
      title: "Drive Dynamics",
      desc: "Cubic aero drag (v³) & aggressive drive penalty",
      icon: Gauge,
      color: "text-cyan-400",
      badge: "v³ Drag",
    },
    {
      id: 3,
      title: "Regen Efficiency",
      desc: "Downhill gravity recovery with 80% realistic cap",
      icon: BatteryCharging,
      color: "text-emerald-300",
      badge: "2.2 m/s² Cap",
    },
    {
      id: 4,
      title: "HVAC & Thermals",
      desc: "Cabin delta-T draw + eco heated seat conservation",
      icon: Thermometer,
      color: "text-amber-400",
      badge: "ΔT Draw",
    },
    {
      id: 5,
      title: "Route Planner",
      desc: "8-constraint energy forecast & arrival SOC",
      icon: Navigation,
      color: "text-indigo-400",
      badge: "8 Constraints",
    },
    {
      id: 6,
      title: "Tires & Surface",
      desc: "4-wheel PSI monitor with wet (+25%) / snow (+50%) Crr",
      icon: Activity,
      color: "text-blue-400",
      badge: "38 PSI",
    },
    {
      id: 7,
      title: "Payload & Mass",
      desc: "Live passenger count, cargo & front/rear axle ratio",
      icon: Car,
      color: "text-rose-400",
      badge: "1780 kg",
    },
    {
      id: 8,
      title: "System Diagnostics",
      desc: "Mechanical wheel vs auxiliary vs net battery flow",
      icon: Zap,
      color: "text-purple-400",
      badge: "Power Flow",
    },
    {
      id: 9,
      title: "Google Maps EV Routes",
      desc: "2-4 multi-path comparison & best EV route picker",
      icon: MapPin,
      color: "text-emerald-400",
      badge: "Google Maps",
    },
  ];

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-7 pointer-events-none select-none overflow-y-auto">
      {/* ────────────────────────────────────────────────────────────
          TOP NAVIGATION BAR (Glassmorphism)
          ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between pointer-events-auto max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 text-white shadow-xl">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-bold font-mono tracking-widest uppercase text-white">
              SYLVA EV
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
              Live Telemetry Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExploreBiome}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/15 text-white/80 hover:text-white text-xs font-medium transition cursor-pointer shadow-xl"
            title="Explore 3D Biome in Zen Mode"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zen 3D View</span>
          </button>

          <button
            onClick={() => onLaunchCockpit(1)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/35 backdrop-blur-md border border-emerald-400/50 text-emerald-200 text-xs font-bold transition cursor-pointer shadow-xl"
          >
            <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>Open Cockpit</span>
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────
          HERO SECTION (Centered Floating Glass Portal)
          ──────────────────────────────────────────────────────────── */}
      <section className="my-auto py-6 max-w-4xl w-full mx-auto pointer-events-auto space-y-6 text-center">
        {/* Subtitle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-xs font-mono text-emerald-300 shadow-xl">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>ThreeUI Procedural World × EV Physics &amp; Telemetry Suite</span>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
            Electric Vehicle Physics &amp; Telemetry
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed drop-shadow">
            Experience an autonomous EV powertrain simulator layered transparently over a living 3D procedural moss-root world with drifting pollen and a landing butterfly.
          </p>
        </div>

        {/* Live Status Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto text-left font-mono">
          <div className="p-3 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 text-white shadow-lg">
            <span className="text-[10px] text-white/50 uppercase block">Battery Pack</span>
            <span className="text-base font-bold text-emerald-300">82 kWh (96% SOH)</span>
          </div>
          <div className="p-3 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 text-white shadow-lg">
            <span className="text-[10px] text-white/50 uppercase block">Safe Range</span>
            <span className="text-base font-bold text-cyan-300">361.6 km</span>
          </div>
          <div className="p-3 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 text-white shadow-lg">
            <span className="text-[10px] text-white/50 uppercase block">Simulation</span>
            <span className="text-base font-bold text-amber-300">Live Autopilot</span>
          </div>
          <div className="p-3 rounded-2xl bg-black/35 backdrop-blur-md border border-white/15 text-white shadow-lg">
            <span className="text-[10px] text-white/50 uppercase block">Active Biome</span>
            <span className="text-base font-bold text-white flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${variantLabels[currentVariant].color}`} />
              <span className="capitalize">{currentVariant.replace("-", " ")}</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onLaunchCockpit(1)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-emerald-500/30 hover:bg-emerald-500/40 border border-emerald-400/50 text-white font-semibold text-sm transition cursor-pointer shadow-2xl hover:scale-105 active:scale-95"
          >
            <Gauge className="w-4 h-4 text-emerald-300" />
            <span>Launch Cockpit</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onLaunchCockpit(9)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 font-medium text-sm transition cursor-pointer shadow-xl"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Google Maps EV Routes</span>
          </button>

          <button
            onClick={() => onLaunchCockpit(5)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/15 text-white font-medium text-sm transition cursor-pointer shadow-xl"
          >
            <Navigation className="w-4 h-4 text-indigo-400" />
            <span>Route &amp; Energy Planner</span>
          </button>

          <button
            onClick={onExploreBiome}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/40 hover:bg-black/60 border border-white/15 text-white font-medium text-sm transition cursor-pointer shadow-xl"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Explore 3D Biome</span>
          </button>
        </div>

        {/* ────────────────────────────────────────────────────────────
            9-MODULE DIRECT ACCESS GRID
            ──────────────────────────────────────────────────────────── */}
        <div className="pt-4 space-y-2 text-left">
          <div className="flex items-center justify-between px-1 text-xs font-mono text-white/60">
            <span>SELECT A MODULE TO EXPLORE IN ISOLATION:</span>
            <span>9 INDIVIDUAL PANELS</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => onLaunchCockpit(m.id)}
                  className="p-3.5 rounded-2xl bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/15 hover:border-white/30 text-left transition-all hover:scale-[1.02] cursor-pointer shadow-xl group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${m.color}`} />
                      <span className="text-xs font-bold text-white group-hover:text-emerald-300 font-mono">
                        {m.id}. {m.title}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition" />
                  </div>
                  <p className="text-[11px] text-white/65 line-clamp-2 leading-tight">
                    {m.desc}
                  </p>
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                      {m.badge}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono opacity-0 group-hover:opacity-100 transition">
                      Simulate →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          BOTTOM DOCK: Biome Season Switcher
          ──────────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-center pointer-events-auto max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 text-white shadow-2xl">
          <span className="text-[11px] font-mono text-white/50 px-2 hidden sm:inline">
            Living Biome:
          </span>
          {SYLVA_LIVING_WORLD_VARIANTS.map((v) => {
            const isActive = currentVariant === v;
            const data = variantLabels[v];
            return (
              <button
                key={v}
                onClick={() => onVariantChange(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide transition cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-white/25 text-white shadow-sm border border-white/30"
                    : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${data.color}`} />
                <span>{data.label}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
