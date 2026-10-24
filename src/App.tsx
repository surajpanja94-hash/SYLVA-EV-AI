/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  SylvaLivingWorldScene,
  type SylvaLivingWorldVariant,
  SYLVA_LIVING_WORLD_VARIANTS,
} from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";
import { EVTelemetryPanelContainer } from "./components/EVTelemetryModules";
import { HomeScreen } from "./components/HomeScreen";
import { Home, Gauge, Eye, Sparkles } from "lucide-react";

/**
 * Configured usage from ThreeUI for SylvaLivingWorldScene:
 * Procedural moss-root world with pale flowers, ferns, drifting pollen,
 * scan light, and a landing butterfly.
 */
export function Scene({
  variant = "living-green",
}: {
  variant?: SylvaLivingWorldVariant;
} = {}) {
  return (
    <div className="shader-frame">
      <SylvaLivingWorldScene variant={variant} />
    </div>
  );
}

export type AppScreen = "home" | "cockpit" | "zen";

export default function App() {
  const [currentVariant, setCurrentVariant] =
    useState<SylvaLivingWorldVariant>("living-green");
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("home");
  const [targetModule, setTargetModule] = useState<number>(1);
  const [cockpitViewMode, setCockpitViewMode] = useState<"grid" | "single">("grid");

  const handleLaunchCockpit = (initialModule?: number) => {
    if (initialModule && initialModule >= 1 && initialModule <= 9) {
      setTargetModule(initialModule);
      setCockpitViewMode("single");
    } else {
      setCockpitViewMode("grid");
    }
    setCurrentScreen("cockpit");
  };

  const handleBackToHome = () => {
    setCurrentScreen("home");
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-[#4a4d44]">
      {/* 1. Full 3D Background: Sylva Living World (procedural moss-root, pale blooms, ferns, pollen, landing butterfly) */}
      <Scene variant={currentVariant} />

      {/* 2. Screen: Home Screen Portal (Glassmorphic Transparent Overlay) */}
      {currentScreen === "home" && (
        <HomeScreen
          currentVariant={currentVariant}
          onVariantChange={setCurrentVariant}
          onLaunchCockpit={handleLaunchCockpit}
          onExploreBiome={() => setCurrentScreen("zen")}
        />
      )}

      {/* 3. Screen: 8-Module EV Cockpit & Telemetry Container */}
      {currentScreen === "cockpit" && (
        <EVTelemetryPanelContainer
          currentVariant={currentVariant}
          onVariantChange={(v) => setCurrentVariant(v as SylvaLivingWorldVariant)}
          onBackToHome={handleBackToHome}
          initialFocusedModule={targetModule}
          initialViewMode={cockpitViewMode}
        />
      )}

      {/* 4. Screen: Zen 3D Exploration Mode Overlay */}
      {currentScreen === "zen" && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
          <header className="flex items-center justify-between pointer-events-auto max-w-5xl w-full mx-auto">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/15 text-white/90 hover:text-white text-xs font-mono transition shadow-xl cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span>← Back to Home</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-[11px] font-mono text-emerald-300 shadow-xl">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Zen Biome Mode · Full 3D Interactive World</span>
            </div>

            <button
              onClick={() => handleLaunchCockpit(1)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/25 hover:bg-emerald-500/35 backdrop-blur-md border border-emerald-400/50 text-emerald-200 text-xs font-mono font-medium transition shadow-xl cursor-pointer"
            >
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cockpit</span>
            </button>
          </header>

          <footer className="flex items-center justify-center pointer-events-auto max-w-2xl w-full mx-auto">
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 text-white shadow-2xl">
              <span className="text-[11px] font-mono text-white/50 px-2 hidden sm:inline">
                Atmosphere:
              </span>
              {SYLVA_LIVING_WORLD_VARIANTS.map((v) => (
                <button
                  key={v}
                  onClick={() => setCurrentVariant(v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide transition cursor-pointer capitalize ${
                    currentVariant === v
                      ? "bg-white/25 text-white shadow-sm border border-white/30"
                      : "text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
                  }`}
                >
                  {v.replace("-", " ")}
                </button>
              ))}
            </div>
          </footer>
        </div>
      )}

      {/* 5. Fixed Fast Navigation Pill (Top Right) */}
      <aside aria-label="Screen switcher" className="fixed top-3 right-3 z-30 pointer-events-auto hidden sm:block">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 shadow-lg text-[11px] font-mono">
          <button
            onClick={() => setCurrentScreen("home")}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              currentScreen === "home"
                ? "bg-white/25 text-white border border-white/20"
                : "text-white/60 hover:text-white"
            }`}
            title="Go to Home Screen"
          >
            <Home className="w-3 h-3 text-emerald-400" />
            <span>Home</span>
          </button>
          <button
            onClick={() => handleLaunchCockpit()}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              currentScreen === "cockpit"
                ? "bg-white/25 text-white border border-white/20"
                : "text-white/60 hover:text-white"
            }`}
            title="Open 8 Telemetry Panels Cockpit"
          >
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>Cockpit</span>
          </button>
          <button
            onClick={() => setCurrentScreen("zen")}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              currentScreen === "zen"
                ? "bg-white/25 text-white border border-white/20"
                : "text-white/60 hover:text-white"
            }`}
            title="Zen 3D View"
          >
            <Eye className="w-3 h-3 text-amber-300" />
            <span>Zen</span>
          </button>
        </div>
      </aside>
    </main>
  );
}
