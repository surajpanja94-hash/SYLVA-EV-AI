/// <reference types="google.maps" />
// Source: Google Maps Platform Code Assist
/**
 * Module 9: Google Maps EV Multi-Route Optimizer
 * Evaluates 2 to 4 routes dynamically using EV physics and indicates the best route for an EV car.
 */
import React, { useState, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  useMapsLibrary,
  useMap,
  AdvancedMarker,
  Pin,
} from "@vis.gl/react-google-maps";
import {
  MapPin,
  Navigation,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Gauge,
  CheckCircle2,
  AlertCircle,
  BatteryCharging,
  Layers,
  Sparkles,
  Compass,
} from "lucide-react";

export type LatLngCoord = { lat: number; lng: number };

export interface EVRouteOption {
  id: string;
  name: string;
  type: "eco" | "highway" | "urban" | "mountain";
  tag: string;
  isBestEV: boolean;
  distanceKm: number;
  durationMins: number;
  avgSpeedKmh: number;
  elevGainM: number;
  elevLossM: number;
  trafficLevel: "Low" | "Moderate" | "Heavy";
  trafficPenaltyPct: number;
  energyKwh: number;
  efficiencyWhKm: number;
  regenRecoveredKwh: number;
  arrivalSocPct: number;
  color: string;
  dashPattern?: boolean;
  evSummary: string;
  waypoints: LatLngCoord[];
}

export interface EVCorridor {
  id: string;
  title: string;
  originName: string;
  destinationName: string;
  originCoords: LatLngCoord;
  destinationCoords: LatLngCoord;
  center: LatLngCoord;
  zoom: number;
  routes: EVRouteOption[];
}

export const PRESET_EV_CORRIDORS: EVCorridor[] = [
  {
    id: "sierra-pass",
    title: "Sierra Foothills → Alpine Valley",
    originName: "Sacramento Metro",
    destinationName: "Lake Tahoe Basin",
    originCoords: { lat: 38.5816, lng: -121.4944 },
    destinationCoords: { lat: 39.0968, lng: -120.0324 },
    center: { lat: 38.85, lng: -120.8 },
    zoom: 9,
    routes: [
      {
        id: "r1-eco",
        name: "Route 1 · Eco-Regen Valley (HWY 50)",
        type: "eco",
        tag: "Best for EV Battery",
        isBestEV: true,
        distanceKm: 168,
        durationMins: 118,
        avgSpeedKmh: 85,
        elevGainM: 1850,
        elevLossM: 320,
        trafficLevel: "Low",
        trafficPenaltyPct: 2,
        energyKwh: 26.4,
        efficiencyWhKm: 157,
        regenRecoveredKwh: 4.8,
        arrivalSocPct: 45.8,
        color: "#10b981", // Emerald
        evSummary: "Optimal speed (85 km/h) minimizes cubic drag (v³). Smooth switchbacks capture +4.8 kWh regen on downhill steps.",
        waypoints: [
          { lat: 38.5816, lng: -121.4944 },
          { lat: 38.633, lng: -121.152 },
          { lat: 38.672, lng: -120.95 },
          { lat: 38.729, lng: -120.798 },
          { lat: 38.765, lng: -120.52 },
          { lat: 38.815, lng: -120.25 },
          { lat: 38.93, lng: -120.08 },
          { lat: 39.0968, lng: -120.0324 },
        ],
      },
      {
        id: "r2-highway",
        name: "Route 2 · Fast Interstate Expressway (I-80)",
        type: "highway",
        tag: "Fastest Travel Time",
        isBestEV: false,
        distanceKm: 184,
        durationMins: 105,
        avgSpeedKmh: 115,
        elevGainM: 2180,
        elevLossM: 250,
        trafficLevel: "Low",
        trafficPenaltyPct: 1,
        energyKwh: 36.8,
        efficiencyWhKm: 200,
        regenRecoveredKwh: 2.1,
        arrivalSocPct: 33.1,
        color: "#06b6d4", // Cyan
        evSummary: "13 mins faster, but high sustained speed (115 km/h) increases aerodynamic resistance by +52%, burning +10.4 kWh.",
        waypoints: [
          { lat: 38.5816, lng: -121.4944 },
          { lat: 38.752, lng: -121.288 },
          { lat: 38.895, lng: -121.076 },
          { lat: 39.135, lng: -120.715 },
          { lat: 39.315, lng: -120.32 },
          { lat: 39.328, lng: -120.183 },
          { lat: 39.245, lng: -120.08 },
          { lat: 39.0968, lng: -120.0324 },
        ],
      },
      {
        id: "r3-urban",
        name: "Route 3 · Sub-Ridge Arterial Bypass",
        type: "urban",
        tag: "Moderate Gradient",
        isBestEV: false,
        distanceKm: 175,
        durationMins: 132,
        avgSpeedKmh: 75,
        elevGainM: 1650,
        elevLossM: 410,
        trafficLevel: "Moderate",
        trafficPenaltyPct: 8,
        energyKwh: 29.8,
        efficiencyWhKm: 170,
        regenRecoveredKwh: 3.9,
        arrivalSocPct: 41.6,
        color: "#a855f7", // Purple
        evSummary: "Lower hill climb gradient, but moderate traffic stop-and-go acceleration introduces an 8% inertia energy penalty.",
        waypoints: [
          { lat: 38.5816, lng: -121.4944 },
          { lat: 38.54, lng: -121.2 },
          { lat: 38.51, lng: -120.85 },
          { lat: 38.58, lng: -120.6 },
          { lat: 38.68, lng: -120.35 },
          { lat: 38.82, lng: -120.15 },
          { lat: 39.0968, lng: -120.0324 },
        ],
      },
      {
        id: "r4-mountain",
        name: "Route 4 · High Sierra Scenic Crest (HWY 88)",
        type: "mountain",
        tag: "Steep Topography",
        isBestEV: false,
        distanceKm: 202,
        durationMins: 148,
        avgSpeedKmh: 78,
        elevGainM: 2600,
        elevLossM: 850,
        trafficLevel: "Low",
        trafficPenaltyPct: 3,
        energyKwh: 38.9,
        efficiencyWhKm: 192,
        regenRecoveredKwh: 6.2,
        arrivalSocPct: 30.5,
        color: "#f59e0b", // Amber
        evSummary: "Extreme elevation rise (+2600m) demands heavy pack discharge. Arrives near 30% safety reserve; charging caution active.",
        waypoints: [
          { lat: 38.5816, lng: -121.4944 },
          { lat: 38.45, lng: -121.0 },
          { lat: 38.35, lng: -120.6 },
          { lat: 38.55, lng: -120.1 },
          { lat: 38.7, lng: -119.85 },
          { lat: 38.95, lng: -119.98 },
          { lat: 39.0968, lng: -120.0324 },
        ],
      },
    ],
  },
  {
    id: "coastal-pass",
    title: "Pacific Coast EV Highway",
    originName: "Silicon Valley",
    destinationName: "Monterey Bay Coast",
    originCoords: { lat: 37.3861, lng: -122.0839 },
    destinationCoords: { lat: 36.6002, lng: -121.8947 },
    center: { lat: 37.0, lng: -121.95 },
    zoom: 10,
    routes: [
      {
        id: "c1-eco",
        name: "Route 1 · Pacific Shoreline (HWY 1)",
        type: "eco",
        tag: "Best for EV Battery",
        isBestEV: true,
        distanceKm: 112,
        durationMins: 88,
        avgSpeedKmh: 76,
        elevGainM: 220,
        elevLossM: 215,
        trafficLevel: "Low",
        trafficPenaltyPct: 2,
        energyKwh: 15.6,
        efficiencyWhKm: 139,
        regenRecoveredKwh: 1.8,
        arrivalSocPct: 58.9,
        color: "#10b981",
        evSummary: "Flat sea-level route with mild temperatures (18°C) minimizing HVAC draw. Steady 76 km/h gives lowest aerodynamic drag.",
        waypoints: [
          { lat: 37.3861, lng: -122.0839 },
          { lat: 37.3, lng: -122.2 },
          { lat: 37.05, lng: -122.25 },
          { lat: 36.97, lng: -122.02 },
          { lat: 36.8, lng: -121.82 },
          { lat: 36.6002, lng: -121.8947 },
        ],
      },
      {
        id: "c2-highway",
        name: "Route 2 · Inland Highway 101 Expressway",
        type: "highway",
        tag: "Fastest Speed",
        isBestEV: false,
        distanceKm: 124,
        durationMins: 76,
        avgSpeedKmh: 110,
        elevGainM: 340,
        elevLossM: 330,
        trafficLevel: "Low",
        trafficPenaltyPct: 1,
        energyKwh: 23.8,
        efficiencyWhKm: 191,
        regenRecoveredKwh: 0.9,
        arrivalSocPct: 48.9,
        color: "#06b6d4",
        evSummary: "Saves 12 minutes, but high freeway speeds push battery consumption to 191 Wh/km.",
        waypoints: [
          { lat: 37.3861, lng: -122.0839 },
          { lat: 37.2, lng: -121.85 },
          { lat: 36.95, lng: -121.55 },
          { lat: 36.75, lng: -121.65 },
          { lat: 36.6002, lng: -121.8947 },
        ],
      },
      {
        id: "c3-mountain",
        name: "Route 3 · Santa Cruz Mountain Ridge (HWY 17)",
        type: "mountain",
        tag: "Elevation Climb",
        isBestEV: false,
        distanceKm: 118,
        durationMins: 94,
        avgSpeedKmh: 72,
        elevGainM: 780,
        elevLossM: 770,
        trafficLevel: "Moderate",
        trafficPenaltyPct: 6,
        energyKwh: 20.4,
        efficiencyWhKm: 172,
        regenRecoveredKwh: 3.1,
        arrivalSocPct: 53.0,
        color: "#f59e0b",
        evSummary: "Ridge climb draws heavy initial battery power, partially recovered during steep downhill descent into Santa Cruz.",
        waypoints: [
          { lat: 37.3861, lng: -122.0839 },
          { lat: 37.25, lng: -121.98 },
          { lat: 37.12, lng: -121.95 },
          { lat: 36.98, lng: -122.03 },
          { lat: 36.8, lng: -121.8 },
          { lat: 36.6002, lng: -121.8947 },
        ],
      },
    ],
  },
];

/**
 * Custom Map Polyline Renderer that uses google.maps.Polyline instances
 */
function MultiRouteMapPolylines({
  routes,
  selectedRouteId,
  onSelectRoute,
}: {
  routes: EVRouteOption[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const coreLib = useMapsLibrary("core");
  const polylinesListRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || !mapsLib || !coreLib) return;

    // Clear existing
    polylinesListRef.current.forEach((pl) => pl.setMap(null));
    polylinesListRef.current = [];

    const bounds = new coreLib.LatLngBounds();

    routes.forEach((r) => {
      const isSelected = r.id === selectedRouteId;
      const poly = new mapsLib.Polyline({
        path: r.waypoints,
        geodesic: true,
        strokeColor: r.color,
        strokeOpacity: isSelected ? 0.95 : 0.45,
        strokeWeight: isSelected ? 6 : 3.5,
        zIndex: isSelected ? 100 : r.isBestEV ? 50 : 10,
        map: map,
      });

      poly.addListener("click", () => {
        onSelectRoute(r.id);
      });

      r.waypoints.forEach((pt) => bounds.extend(pt));
      polylinesListRef.current.push(poly);
    });

    if (routes.length > 0 && !bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }

    return () => {
      polylinesListRef.current.forEach((pl) => pl.setMap(null));
      polylinesListRef.current = [];
    };
  }, [map, mapsLib, coreLib, routes, selectedRouteId, onSelectRoute]);

  return null;
}

export function EVRouteMapModule({
  className = "",
  initialBatterySoc = 78,
  usablePackKwh = 77.5,
}: {
  className?: string;
  initialBatterySoc?: number;
  usablePackKwh?: number;
}) {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    "AIzaSyClFV9d-j9uIbrtxpwgIARMNSMosOOfSoY";

  const [activeCorridorIndex, setActiveCorridorIndex] = useState<number>(0);
  const [routeCountFilter, setRouteCountFilter] = useState<number>(4); // Show 2 to 4 routes
  const [selectedRouteId, setSelectedRouteId] = useState<string>("r1-eco");

  const currentCorridor = PRESET_EV_CORRIDORS[activeCorridorIndex];

  // Filter 2 to 4 routes as requested by user
  const visibleRoutes = currentCorridor.routes.slice(0, Math.min(routeCountFilter, currentCorridor.routes.length));

  // Sync selected route if filtered out
  useEffect(() => {
    if (!visibleRoutes.find((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(visibleRoutes[0]?.id || "r1-eco");
    }
  }, [visibleRoutes, selectedRouteId]);

  const activeRoute = visibleRoutes.find((r) => r.id === selectedRouteId) || visibleRoutes[0];
  const bestRoute = visibleRoutes.find((r) => r.isBestEV) || visibleRoutes[0];

  return (
    <div className={`flex flex-col h-full space-y-3 font-sans ${className}`}>
      {/* ────────────────────────────────────────────────────────────
          HEADER: Multi-Route Selector & EV Best Route Banner
          ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wide uppercase text-white">
                9. Google Maps EV Multi-Route Optimizer
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {visibleRoutes.length} Alternative Routes
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              Evaluates cubic aero drag, topography, and regenerative braking to identify the most battery-efficient path.
            </p>
          </div>
        </div>

        {/* Controls: Corridor Switcher & Route Count (2 to 4) */}
        <div className="flex items-center gap-2">
          {/* Corridor Selection */}
          <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10 text-xs">
            {PRESET_EV_CORRIDORS.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCorridorIndex(idx);
                  setSelectedRouteId(c.routes[0].id);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                  activeCorridorIndex === idx
                    ? "bg-white/20 text-white font-bold shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {idx === 0 ? "Sierra Pass" : "Pacific Coast"}
              </button>
            ))}
          </div>

          {/* Number of Routes (2 to 4) */}
          <div className="flex items-center gap-1 bg-black/40 rounded-xl p-0.5 border border-white/10 text-xs">
            <span className="text-[10px] font-mono text-white/50 px-1.5">Routes:</span>
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => setRouteCountFilter(count)}
                className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer flex items-center justify-center ${
                  routeCountFilter === count
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/40"
                    : "text-white/60 hover:text-white"
                }`}
                title={`Compare ${count} routes`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SPLIT VIEW: Interactive Google Map + EV Telemetry Cards
          ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[460px]">
        {/* Left Column: Interactive Google Map (60% width on large screens) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl overflow-hidden border border-white/15 bg-black/30 backdrop-blur-md relative min-h-[300px] lg:min-h-full">
          {/* Top Floating Map Bar */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between pointer-events-auto">
            <div className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-xs text-white flex items-center gap-2 shadow-lg">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-emerald-300">{currentCorridor.originName}</span>
              <span className="text-white/40">→</span>
              <span className="font-semibold text-cyan-300">{currentCorridor.destinationName}</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>EV Suggestion Active</span>
            </div>
          </div>

          {/* Google Maps Viewport with @vis.gl/react-google-maps */}
          <div className="flex-1 w-full h-full min-h-[320px] relative">
            <APIProvider apiKey={apiKey} libraries={["routes", "marker", "geometry"]}>
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={currentCorridor.center}
                defaultZoom={currentCorridor.zoom}
                gestureHandling="greedy"
                disableDefaultUI={false}
                mapTypeControl={false}
                streetViewControl={false}
                fullscreenControl={false}
                className="w-full h-full min-h-[320px]"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              >
                {/* Start Marker (Origin) */}
                <AdvancedMarker position={currentCorridor.originCoords} title="Origin">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-mono font-bold shadow-lg border border-white/30">
                    <Zap className="w-3 h-3" />
                    <span>START</span>
                  </div>
                </AdvancedMarker>

                {/* Destination Marker */}
                <AdvancedMarker position={currentCorridor.destinationCoords} title="Destination">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-600 text-white text-[10px] font-mono font-bold shadow-lg border border-white/30">
                    <MapPin className="w-3 h-3" />
                    <span>DESTINATION</span>
                  </div>
                </AdvancedMarker>

                {/* Multi-Route Polylines (Renders 2 to 4 paths with color coding) */}
                <MultiRouteMapPolylines
                  routes={visibleRoutes}
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={setSelectedRouteId}
                />
              </Map>
            </APIProvider>
          </div>

          {/* Bottom Map Legend */}
          <div className="p-2 bg-black/60 backdrop-blur-md border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] font-mono text-white/70">
            <div className="flex items-center gap-3">
              {visibleRoutes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition cursor-pointer ${
                    r.id === selectedRouteId ? "bg-white/20 text-white font-bold" : "hover:text-white"
                  }`}
                >
                  <span className="w-3 h-1 rounded-full" style={{ backgroundColor: r.color }} />
                  <span>{r.name.split("·")[0].trim()}</span>
                  {r.isBestEV && <span className="text-emerald-400 text-[9px] font-bold">★ BEST</span>}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-white/50">Click route line or card to inspect</span>
          </div>
        </div>

        {/* Right Column: EV Multi-Path Analysis & Best Route Recommendation */}
        <div className="lg:col-span-5 flex flex-col space-y-2.5 overflow-y-auto pr-0.5">
          {/* AI Best Route Suggestion Callout */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-400/40 backdrop-blur-md text-white space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs font-mono uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>AI Recommended Route for EV Car</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                +{(bestRoute.arrivalSocPct - (visibleRoutes.find(r => r.id === "r2-highway" || r.id === "c2-highway")?.arrivalSocPct || 33)).toFixed(1)}% More SOC
              </span>
            </div>

            <p className="text-xs text-white/90 leading-relaxed">
              <strong className="text-emerald-300">{bestRoute.name}:</strong>{" "}
              {bestRoute.evSummary}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
              <div className="p-1.5 rounded-lg bg-black/30 border border-white/10">
                <span className="text-white/50 text-[9px] block">Net Energy</span>
                <span className="font-bold text-emerald-300">{bestRoute.energyKwh} kWh</span>
              </div>
              <div className="p-1.5 rounded-lg bg-black/30 border border-white/10">
                <span className="text-white/50 text-[9px] block">Regen Gained</span>
                <span className="font-bold text-emerald-400">+{bestRoute.regenRecoveredKwh} kWh</span>
              </div>
              <div className="p-1.5 rounded-lg bg-black/30 border border-white/10">
                <span className="text-white/50 text-[9px] block">Arrival SOC</span>
                <span className="font-bold text-cyan-300">{bestRoute.arrivalSocPct}%</span>
              </div>
            </div>
          </div>

          {/* 2 to 4 Route Cards Comparison */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-white/60 px-1">
              <span>COMPARE {visibleRoutes.length} ROUTES:</span>
              <span>CLICK TO HIGHLIGHT ON MAP</span>
            </div>

            {visibleRoutes.map((r, i) => {
              const isSelected = r.id === selectedRouteId;
              const energyDelta = r.energyKwh - bestRoute.energyKwh;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRouteId(r.id)}
                  className={`p-3 rounded-2xl transition cursor-pointer border ${
                    isSelected
                      ? "bg-black/50 border-white/30 shadow-xl ring-1 ring-white/20"
                      : "bg-black/25 hover:bg-black/40 border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className={`text-xs font-bold font-mono ${isSelected ? "text-white" : "text-white/80"}`}>
                        {r.name}
                      </span>
                    </div>

                    {r.isBestEV ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 font-bold">
                        ★ BEST FOR EV
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        +{energyDelta.toFixed(1)} kWh
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 mt-2.5 text-center text-xs font-mono">
                    <div className="p-1 rounded-lg bg-black/30">
                      <span className="text-[9px] text-white/50 block">Distance</span>
                      <span className="font-bold text-white">{r.distanceKm} km</span>
                    </div>
                    <div className="p-1 rounded-lg bg-black/30">
                      <span className="text-[9px] text-white/50 block">Est. Time</span>
                      <span className="font-bold text-white">{Math.floor(r.durationMins / 60)}h {r.durationMins % 60}m</span>
                    </div>
                    <div className="p-1 rounded-lg bg-black/30">
                      <span className="text-[9px] text-white/50 block">Avg Speed</span>
                      <span className="font-bold text-cyan-300">{r.avgSpeedKmh} km/h</span>
                    </div>
                    <div className="p-1 rounded-lg bg-black/30">
                      <span className="text-[9px] text-white/50 block">Est. Arrival</span>
                      <span className={`font-bold ${r.arrivalSocPct >= 40 ? "text-emerald-300" : "text-amber-300"}`}>
                        {r.arrivalSocPct}%
                      </span>
                    </div>
                  </div>

                  {/* Physics & Efficiency Metrics */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[11px] font-mono text-white/70">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-amber-400" />
                      <span>+{r.elevGainM}m climb</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <BatteryCharging className="w-3 h-3 text-emerald-400" />
                      <span>+{r.regenRecoveredKwh} kWh regen</span>
                    </span>
                    <span className="text-white/90 font-bold">
                      {r.efficiencyWhKm} Wh/km
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Route Physics Insights Box */}
          <div className="p-3 rounded-2xl bg-black/35 border border-white/10 text-xs font-mono space-y-1.5 text-white/80">
            <div className="flex items-center justify-between text-white font-bold border-b border-white/10 pb-1">
              <span>{activeRoute.name.split("·")[0]} Powertrain Breakdown</span>
              <span style={{ color: activeRoute.color }}>{activeRoute.tag}</span>
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed">
              {activeRoute.evSummary}
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-white/60">
              <span>Air Drag Factor: {activeRoute.avgSpeedKmh > 100 ? "High (v³ penalised)" : "Low to Moderate"}</span>
              <span>Traffic Stop-Loss: +{activeRoute.trafficPenaltyPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
