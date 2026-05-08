"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Sparkles, MousePointer2, SlidersHorizontal, Users, ChevronLeft, Wifi, WifiOff } from "lucide-react";
import { useEventSocket, SeatStatusChange } from "@/hooks/useEventSocket";

export interface Seat {
  id: string; x: number; y: number; radius: number;
  status: "available" | "held" | "taken";
  price: number; section: string; row: number; col: number;
}

type SectionType = "vip" | "floor" | "standard" | "swan" | "sword" | "ballerina" | "feather" | "moonlight";

interface SectionInfo {
  name: string; type: SectionType;
  minX: number; maxX: number; minY: number; maxY: number;
  minPrice: number; availableSeats: number; totalSeats: number;
}

// ── Overview shape types ──────────────────────────────────────────────────────
type ShapeRect = { kind: "rect"; x: number; y: number; w: number; h: number };
type ShapeArc  = { kind: "arc";  cx: number; cy: number; r1: number; r2: number; a0: number; a1: number };
type ShapePoly = { kind: "poly"; points: [number, number][] };
type OverviewShape = ShapeRect | ShapeArc | ShapePoly;

function applyShapePath(ctx: CanvasRenderingContext2D, s: OverviewShape) {
  ctx.beginPath();
  if (s.kind === "rect") {
    ctx.roundRect(s.x, s.y, s.w, s.h, 7);
  } else if (s.kind === "arc") {
    ctx.arc(s.cx, s.cy, s.r2, s.a0, s.a1);
    ctx.arc(s.cx, s.cy, s.r1, s.a1, s.a0, true);
    ctx.closePath();
  } else {
    ctx.moveTo(s.points[0][0], s.points[0][1]);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i][0], s.points[i][1]);
    ctx.closePath();
  }
}

function pointInShape(px: number, py: number, s: OverviewShape): boolean {
  if (s.kind === "rect") return px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h;
  if (s.kind === "arc") {
    const dist = Math.sqrt((px - s.cx) ** 2 + (py - s.cy) ** 2);
    if (dist < s.r1 || dist > s.r2) return false;
    let a = Math.atan2(py - s.cy, px - s.cx);
    if (a < 0) a += Math.PI * 2;
    const a0 = ((s.a0 % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const a1 = ((s.a1 % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return a0 <= a1 ? a >= a0 && a <= a1 : a >= a0 || a <= a1;
  }
  // Ray-casting for polygon
  let inside = false;
  const pts = s.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function shapeCentroid(s: OverviewShape): [number, number] {
  if (s.kind === "rect") return [s.x + s.w / 2, s.y + s.h / 2];
  if (s.kind === "poly") {
    const n = s.points.length;
    return [s.points.reduce((sum, [x]) => sum + x, 0) / n, s.points.reduce((sum, [, y]) => sum + y, 0) / n];
  }
  const midA = (s.a0 + s.a1) / 2, midR = (s.r1 + s.r2) / 2;
  return [s.cx + Math.cos(midA) * midR, s.cy + Math.sin(midA) * midR];
}

const π = Math.PI;

// Swan poly: trapezoid narrow at stage, wide at back
// Left edge: (298,412)→(337,145). Right edge: (463,145)→(502,412)
// Sword L right must stay 5px left of Swan left edge at each y.
// Swan left at y=188: 298+(412-188)/(412-145)*(337-298) ≈ 330 → Sword L right = 325
// Swan left at y=412: 298 → Sword L right = 293
// Swan right at y=188: 463+(188-145)/(412-145)*(502-463) ≈ 470 → Sword R left = 475
// Swan right at y=412: 502 → Sword R left = 507

const OVERVIEW_SHAPES: Record<string, Record<string, OverviewShape>> = {
  arena: {
    "Floor VIP":     { kind: "rect", x: 296, y: 166, w: 208, h: 100 },
    "Floor General": { kind: "rect", x: 276, y: 266, w: 244, h: 136 },
    "Bowl Left":     { kind: "arc",  cx: 400, cy: 230, r1: 206, r2: 432, a0: π * 0.70 - 0.04, a1: π * 0.95 + 0.06 },
    "Bowl Center":   { kind: "arc",  cx: 400, cy: 230, r1: 206, r2: 432, a0: π * 0.35 - 0.04, a1: π * 0.65 + 0.04 },
    "Bowl Right":    { kind: "arc",  cx: 400, cy: 230, r1: 206, r2: 432, a0: π * 0.05 - 0.06, a1: π * 0.30 + 0.04 },
  },
  stadium: {
    "North Stand": { kind: "rect", x: 222, y: 24,  w: 356, h: 122 },
    "South Stand": { kind: "rect", x: 222, y: 448, w: 356, h: 122 },
    "West Stand":  { kind: "rect", x: 64,  y: 182, w: 122, h: 230 },
    "East Stand":  { kind: "rect", x: 614, y: 182, w: 122, h: 230 },
    "NW Corner":   { kind: "arc",  cx: 220, cy: 180, r1: 34, r2: 156, a0: π * 1.0, a1: π * 1.5 },
    "NE Corner":   { kind: "arc",  cx: 580, cy: 180, r1: 34, r2: 156, a0: π * 1.5, a1: π * 2.0 },
    "SW Corner":   { kind: "arc",  cx: 220, cy: 414, r1: 34, r2: 156, a0: π * 0.5, a1: π * 1.0 },
    "SE Corner":   { kind: "arc",  cx: 580, cy: 414, r1: 34, r2: 156, a0: 0,       a1: π * 0.5 },
  },
  theater: {
    "Swan":         { kind: "poly", points: [[323, 138], [477, 138], [504, 400], [296, 400]] },
    "Sword L":      { kind: "rect", x: 202, y: 182, w: 82,  h: 226 },
    "Sword R":      { kind: "rect", x: 516, y: 182, w: 82,  h: 226 },
    "Ballerina L":  { kind: "rect", x: 118, y: 146, w: 82,  h: 262 },
    "Ballerina R":  { kind: "rect", x: 600, y: 146, w: 82,  h: 262 },
    "Feather L":    { kind: "rect", x: 40,  y: 136, w: 82,  h: 262 },
    "Feather R":    { kind: "rect", x: 678, y: 136, w: 82,  h: 262 },
    "2F Feather L":   { kind: "rect", x: 40,  y: 424, w: 172, h: 100 },
    "2F Feather C":   { kind: "rect", x: 214, y: 424, w: 370, h: 100 },
    "2F Feather R":   { kind: "rect", x: 586, y: 424, w: 172, h: 100 },
    "2F Moonlight L": { kind: "rect", x: 40,  y: 542, w: 172, h: 100 },
    "2F Moonlight C": { kind: "rect", x: 214, y: 542, w: 370, h: 100 },
    "2F Moonlight R": { kind: "rect", x: 586, y: 542, w: 172, h: 100 },
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export interface SeatMapProps {
  onSelectionChange: (seats: Seat[]) => void;
  basePrice: number;
  layoutType?: "arena" | "stadium" | "theater";
  selectedSeatIdsProp?: string[];
  eventId?: string;
}

type SectionColor = { hoverFill: string; hoverStroke: string; seat: string };
const SECTION_COLOR: Record<SectionType, SectionColor> = {
  // Arena / stadium generic tiers
  vip:       { hoverFill: "rgba(255,255,255,0.15)",  hoverStroke: "#FFFFFF", seat: "#FFFFFF" },
  floor:     { hoverFill: "rgba(255,255,255,0.10)",  hoverStroke: "#FFFFFF", seat: "#DDDDDD" },
  standard:  { hoverFill: "rgba(255,255,255,0.05)",  hoverStroke: "#FFFFFF", seat: "#AAAAAA" },
  // Concert tiers (theater)
  swan:      { hoverFill: "rgba(255,255,255,0.15)",  hoverStroke: "#FFFFFF", seat: "#FFFFFF" },
  sword:     { hoverFill: "rgba(255,255,255,0.12)",  hoverStroke: "#FFFFFF", seat: "#EEEEEE" },
  ballerina: { hoverFill: "rgba(255,255,255,0.10)",  hoverStroke: "#FFFFFF", seat: "#CCCCCC" },
  feather:   { hoverFill: "rgba(255,255,255,0.08)",  hoverStroke: "#FFFFFF", seat: "#AAAAAA" },
  moonlight: { hoverFill: "rgba(255,255,255,0.05)",  hoverStroke: "#FFFFFF", seat: "#777777" },
};

const getSectionType = (name: string): SectionType => {
  const n = name.toLowerCase();
  if (n.includes("swan"))      return "swan";
  if (n.includes("sword"))     return "sword";
  if (n.includes("ballerina")) return "ballerina";
  if (n.includes("moonlight")) return "moonlight";
  if (n.includes("feather"))   return "feather";
  if (n.includes("vip") || n.includes("corner")) return "vip";
  if (n.includes("floor") || n.includes("general")) return "floor";
  return "standard";
};

const CONCERT_TIERS: { type: SectionType; label: string }[] = [
  { type: "swan",      label: "Swan"      },
  { type: "sword",     label: "Sword"     },
  { type: "ballerina", label: "Ballerina" },
  { type: "feather",   label: "Feather"   },
  { type: "moonlight", label: "Moonlight" },
];

const INITIAL_CAM = { x: 100, y: 35, zoom: 0.72 };
const SECTION_ZOOM_THRESHOLD = 0.92;
const SELECTED_COLOR = "#DFFF00";
const HELD_COLOR     = "#F59E0B"; // amber for seats held by others
const TAKEN_COLOR    = "#222222";

export function SeatMap({ onSelectionChange, basePrice, layoutType = "arena", selectedSeatIdsProp, eventId = "1" }: SeatMapProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const camRef       = useRef({ ...INITIAL_CAM });
  const targetRef    = useRef({ ...INITIAL_CAM });
  const dragRef           = useRef({ isDragging: false, startX: 0, startY: 0, moved: false });
  const tooltipRef        = useRef<HTMLDivElement>(null);
  const activeSectionRef  = useRef<string | null>(null);

  const [seats, setSeats]                   = useState<Seat[]>([]);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [hoveredSeatId, setHoveredSeatId]   = useState<string | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [activeSection, setActiveSection]   = useState<string | null>(null);
  activeSectionRef.current = activeSection;
  const [povSeat, setPovSeat]               = useState<Seat | null>(null);

  const [selectionMode, setSelectionMode] = useState<"manual" | "auto">("manual");
  const [ticketCount, setTicketCount]     = useState(2);
  const [priceMin, setPriceMin]           = useState(0);
  const [priceMax, setPriceMax]           = useState(9999);

  // Render-loop refs — canvas reads these directly so it never lags behind React state
  const selectedIdsRef    = useRef<Set<string>>(new Set());
  const hoveredSeatIdRef  = useRef<string | null>(null);
  const hoveredSectionRef = useRef<string | null>(null);
  const priceMinRef       = useRef(0);
  const priceMaxRef       = useRef(9999);
  selectedIdsRef.current    = selectedIds;
  hoveredSeatIdRef.current  = hoveredSeatId;
  hoveredSectionRef.current = hoveredSection;
  priceMinRef.current       = priceMin;
  priceMaxRef.current       = priceMax;

  const sections = useMemo((): SectionInfo[] => {
    if (!seats.length) return [];
    const map = new Map<string, SectionInfo>();
    seats.forEach((s) => {
      if (!map.has(s.section)) {
        map.set(s.section, {
          name: s.section, type: getSectionType(s.section),
          minX: s.x, maxX: s.x, minY: s.y, maxY: s.y,
          minPrice: s.price, availableSeats: 0, totalSeats: 0,
        });
      }
      const i = map.get(s.section)!;
      if (s.x < i.minX) i.minX = s.x; if (s.x > i.maxX) i.maxX = s.x;
      if (s.y < i.minY) i.minY = s.y; if (s.y > i.maxY) i.maxY = s.y;
      if (s.price < i.minPrice) i.minPrice = s.price;
      i.totalSeats++;
      if (s.status === "available") i.availableSeats++;
    });
    return Array.from(map.values());
  }, [seats]);

  const sectionTypeMap = useMemo(() => {
    const m = new Map<string, SectionType>();
    sections.forEach((s) => m.set(s.name, s.type));
    return m;
  }, [sections]);

  const overviewShapes = useMemo(() => OVERVIEW_SHAPES[layoutType] ?? {}, [layoutType]);

  // Sync state from parent if parent explicitly clears it (e.g. from footer)
  useEffect(() => {
    if (selectedSeatIdsProp !== undefined) {
      const current = selectedIdsRef.current;
      let changed = selectedSeatIdsProp.length !== current.size;
      if (!changed) {
        for (const id of selectedSeatIdsProp) {
          if (!current.has(id)) { changed = true; break; }
        }
      }
      if (changed) {
        setSelectedIds(new Set(selectedSeatIdsProp));
        if (selectedSeatIdsProp.length === 0) setPovSeat(null);
      }
    }
  }, [selectedSeatIdsProp]);

  // Non-passive wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
      const cx = (e.clientX - rect.left) * sx, cy = (e.clientY - rect.top) * sy;
      const wx = (cx - targetRef.current.x) / targetRef.current.zoom;
      const wy = (cy - targetRef.current.y) / targetRef.current.zoom;
      let z = targetRef.current.zoom * (e.deltaY < 0 ? 1.25 : 0.8);
      z = Math.max(0.28, Math.min(z, 5.5));
      targetRef.current = { x: cx - wx * z, y: cy - wy * z, zoom: z };
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // ── Socket integration (replaces client-side Math.random generation) ────────
  const handleSnapshot = useCallback((serverSeats: any[]) => {
    const mapped: Seat[] = serverSeats.map((s: any) => ({
      id: s.id,
      x: s.x,
      y: s.y,
      radius: 6,
      status: s.status === "sold" ? "taken" as const : s.status as Seat["status"],
      price: s.price,
      section: s.section,
      row: s.row,
      col: s.col,
    }));
    setSeats(mapped);
    setSelectedIds(new Set());
    setPovSeat(null);
    setActiveSection(null);
    camRef.current = { ...INITIAL_CAM };
    targetRef.current = { ...INITIAL_CAM };
  }, []);

  const handleSeatChange = useCallback((change: SeatStatusChange) => {
    setSeats((prev) =>
      prev.map((s) =>
        s.id === change.seatId
          ? { ...s, status: change.status === "sold" ? "taken" as const : change.status as Seat["status"] }
          : s
      )
    );
    // If another user holds/buys this seat, remove it from our local selection.
    // Also remove if the server released it back to "available" (TTL expiry or
    // disconnect) — our hold is no longer valid so the cart must drop it.
    setSelectedIds((prev) => {
      if (prev.has(change.seatId)) {
        const next = new Set(prev);
        next.delete(change.seatId);
        return next;
      }
      return prev;
    });
  }, []);

  const handleLockAck = useCallback((ack: { seatId: string; success: boolean; reason?: string }) => {
    if (!ack.success) {
      // Lock failed — remove from our local selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(ack.seatId);
        return next;
      });
    }
  }, []);

  const { connected, emitLock, emitUnlock } = useEventSocket({
    eventId,
    onSnapshot: handleSnapshot,
    onSeatChange: handleSeatChange,
    onLockAck: handleLockAck,
  });

  const maxPrice = useMemo(
    () => seats.length ? Math.ceil(Math.max(...seats.map((s) => s.price))) : 9999,
    [seats]
  );
  useEffect(() => { setPriceMax(maxPrice); setPriceMin(0); }, [maxPrice]);

  const zoomToSection = (name: string) => {
    const sec = sections.find((s) => s.name === name);
    if (!sec || !canvasRef.current) return;
    const pad = 80, canvas = canvasRef.current;
    const z = Math.min(4.0, Math.max(1.1,
      Math.min(canvas.width / (sec.maxX - sec.minX + pad * 2), canvas.height / (sec.maxY - sec.minY + pad * 2))
    ));
    const cx = (sec.minX + sec.maxX) / 2, cy = (sec.minY + sec.maxY) / 2;
    targetRef.current = { x: canvas.width / 2 - cx * z, y: canvas.height / 2 - cy * z, zoom: z };
  };

  const resetView = () => { targetRef.current = { ...INITIAL_CAM }; setActiveSection(null); setPovSeat(null); };
  const clearSelection = () => { setSelectedIds(new Set()); setPovSeat(null); };

  const handleAutoAssign = () => {
    const eligible = seats.filter((s) => s.status === "available" && s.price >= priceMin && s.price <= priceMax);
    const byRow = new Map<string, Seat[]>();
    eligible.forEach((s) => {
      const k = `${s.section}__${s.row}`;
      if (!byRow.has(k)) byRow.set(k, []);
      byRow.get(k)!.push(s);
    });
    const stageY = 90;
    const candidates: { seats: Seat[]; score: number }[] = [];
    byRow.forEach((row) => {
      row.sort((a, b) => a.col - b.col);
      for (let i = 0; i <= row.length - ticketCount; i++) {
        const run = row.slice(i, i + ticketCount);
        let ok = true;
        for (let j = 1; j < run.length; j++) if (run[j].col !== run[j-1].col + 1) { ok = false; break; }
        if (!ok) continue;
        const mid = run[Math.floor(run.length / 2)];
        candidates.push({ seats: run, score: -Math.abs(mid.y - stageY) * 0.8 - mid.price * 0.05 });
      }
    });
    if (!candidates.length) return;
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0].seats;
    setSelectedIds(new Set(best.map((s) => s.id)));
    setPovSeat(best[Math.floor(best.length / 2)]);
    zoomToSection(best[0].section);
    setActiveSection(best[0].section);
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !seats.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    const render = () => {
      const L = 0.14;
      camRef.current.x    += (targetRef.current.x    - camRef.current.x)    * L;
      camRef.current.y    += (targetRef.current.y    - camRef.current.y)    * L;
      camRef.current.zoom += (targetRef.current.zoom - camRef.current.zoom) * L;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(camRef.current.x, camRef.current.y);
      ctx.scale(camRef.current.zoom, camRef.current.zoom);

      const zoom = camRef.current.zoom;
      const isOverview = zoom < SECTION_ZOOM_THRESHOLD;

      // Auto-clear activeSection when user scrolls back to overview
      if (isOverview && activeSectionRef.current) {
        setActiveSection(null);
        activeSectionRef.current = null;
      }

      // Venue geometry
      if (layoutType === "stadium") {
        ctx.fillStyle = "#1a3621";
        ctx.beginPath(); ctx.roundRect(220, 180, 360, 234, 20); ctx.fill();
        ctx.strokeStyle = "#ffffff28"; ctx.lineWidth = 2;
        ctx.strokeRect(230, 190, 340, 214);
        ctx.beginPath(); ctx.moveTo(400,190); ctx.lineTo(400,404); ctx.stroke();
        ctx.beginPath(); ctx.arc(400, 297, 40, 0, π*2); ctx.stroke();
        ctx.fillStyle = "#94a3b8"; ctx.font = "bold 18px Inter,sans-serif";
        ctx.textAlign = "center"; ctx.fillText("FIELD", 400, 303);

      } else if (layoutType === "arena") {
        ctx.fillStyle = "#1e1e24";
        ctx.beginPath(); ctx.roundRect(280, 80, 240, 60, 10); ctx.fill();
        ctx.fillStyle = "#6b7280"; ctx.font = "bold 15px Inter,sans-serif";
        ctx.textAlign = "center"; ctx.fillText("MAIN STAGE", 400, 115);

      } else {
        // Theater stage — ornate arch style
        ctx.fillStyle = "#1a1a22";
        ctx.beginPath(); ctx.roundRect(265, 58, 270, 68, [8,8,0,0]); ctx.fill();
        ctx.fillStyle = "#4b4b60"; ctx.font = "bold 13px Inter,sans-serif";
        ctx.textAlign = "center"; ctx.fillText("✦  S T A G E  ✦", 400, 96);
        // Floor divider between 1F and 2F
        ctx.strokeStyle = "#ffffff22"; ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(45, 422); ctx.lineTo(755, 422); ctx.stroke();
        ctx.setLineDash([]);
        // Floor labels
        ctx.fillStyle = "#ffffff30"; ctx.font = "bold 11px Inter,sans-serif";
        ctx.fillText("1ST FLOOR", 400, 136);
        ctx.fillText("2ND FLOOR", 400, 426);
      }

      if (isOverview) {
        sections.forEach((sec) => {
          const shape = overviewShapes[sec.name];
          if (!shape) return;
          const isHov       = hoveredSectionRef.current === sec.name;
          const hasSeats    = sec.availableSeats > 0;
          const hasSelected = seats.some((s) => s.section === sec.name && selectedIdsRef.current.has(s.id));
          const col         = SECTION_COLOR[sec.type];

          ctx.fillStyle = hasSelected ? "rgba(223,255,0,0.15)" : isHov && hasSeats ? col.hoverFill : "rgba(10,10,10,0.90)";
          applyShapePath(ctx, shape); ctx.fill();

          ctx.strokeStyle = hasSelected ? SELECTED_COLOR : isHov && hasSeats ? col.hoverStroke : "#3f3f5255";
          ctx.lineWidth = (isHov || hasSelected ? 2 : 1) / zoom;
          applyShapePath(ctx, shape); ctx.stroke();

          const [lx, ly] = shapeCentroid(shape);
          ctx.fillStyle   = isHov && hasSeats ? "#ffffff" : hasSeats ? "#9ca3af" : "#4b4b5a";
          ctx.font        = `bold ${Math.min(13, 13)}px Inter,sans-serif`;
          ctx.textAlign   = "center";
          ctx.fillText(sec.name, lx, ly - (hasSeats ? 8 : 0));

          if (hasSeats) {
            ctx.fillStyle = isHov ? col.hoverStroke : "#6b7280";
            ctx.font      = "11px Inter,sans-serif";
            ctx.fillText(`from $${Math.round(sec.minPrice)}`, lx, ly + 10);
            if (isHov) {
              ctx.fillStyle = "#ffffff45";
              ctx.font      = "10px Inter,sans-serif";
              ctx.fillText(`${sec.availableSeats} available`, lx, ly + 26);
            }
          } else {
            ctx.fillStyle = "#3f3f46"; ctx.font = "10px Inter,sans-serif";
            ctx.fillText("SOLD OUT", lx, ly + 12);
          }
        });
      } else {
        // Section background panels — creates visible aisles between sections
        sections.forEach((sec) => {
          const col = SECTION_COLOR[sec.type];
          const shape = overviewShapes[sec.name];
          
          ctx.fillStyle = "rgba(255,255,255,0.03)";
          ctx.strokeStyle = col.hoverStroke + "44";
          ctx.lineWidth = 1.5 / zoom;

          if (shape) {
            applyShapePath(ctx, shape); 
            ctx.fill();
            applyShapePath(ctx, shape); 
            ctx.stroke();
          } else {
            const PANEL_PAD = 8;
            const x = sec.minX - PANEL_PAD, y = sec.minY - PANEL_PAD;
            const w = sec.maxX - sec.minX + PANEL_PAD * 2, h = sec.maxY - sec.minY + PANEL_PAD * 2;
            ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
            ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.stroke();
          }

          // Dynamically distribute labels outwards from the perimeter of the Stadium
          let labelX = (sec.minX + sec.maxX) / 2;
          let labelY = sec.minY - 6 - (8 / zoom); // Default top
          let align = "center" as CanvasTextAlign;

          if (layoutType === "stadium") {
            const padX = 12 + 10 / zoom;
            const padY = 6 + 10 / zoom;
            
            if (sec.name.includes("South") || sec.name.includes("SW Corner") || sec.name.includes("SE Corner")) {
              labelY = sec.maxY + padY + (6 / zoom); 
            } else if (sec.name.includes("West")) {
              labelX = sec.minX - padX;
              labelY = (sec.minY + sec.maxY) / 2;
              align = "right";
            } else if (sec.name.includes("East")) {
              labelX = sec.maxX + padX;
              labelY = (sec.minY + sec.maxY) / 2;
              align = "left";
            }
          }

          ctx.fillStyle = col.hoverStroke + "99";
          ctx.font = `bold ${11 / zoom}px Inter,sans-serif`;
          ctx.textAlign = align;
          ctx.fillText(sec.name, labelX, labelY);
        });

        seats.forEach((seat) => {
          const isSel   = selectedIdsRef.current.has(seat.id);
          const isHov   = hoveredSeatIdRef.current === seat.id;
          const inPrice = seat.price >= priceMinRef.current && seat.price <= priceMaxRef.current;
          const type    = sectionTypeMap.get(seat.section) ?? "standard";

          ctx.globalAlpha = !inPrice && !isSel ? 0.18 : 1;
          ctx.beginPath(); ctx.arc(seat.x, seat.y, seat.radius, 0, π * 2);

          if (seat.status === "taken") { ctx.fillStyle = TAKEN_COLOR; }
          else if (seat.status === "held" && !isSel) {
            // Amber pulse for seats held by other users
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
            ctx.fillStyle = `rgba(245, 158, 11, ${0.4 + pulse * 0.3})`;
            ctx.shadowColor = "#F59E0B44"; ctx.shadowBlur = 6;
          }
          else if (isSel) { ctx.fillStyle = SELECTED_COLOR; ctx.shadowColor = "#DFFF0088"; ctx.shadowBlur = 12; }
          else { ctx.fillStyle = SECTION_COLOR[type].seat; }

          ctx.fill(); ctx.shadowBlur = 0;

          if (isHov && (seat.status === "available" || isSel)) {
            ctx.beginPath(); ctx.arc(seat.x, seat.y, seat.radius, 0, π * 2);
            ctx.lineWidth = 2 / zoom; ctx.strokeStyle = "#ffffff"; ctx.stroke();
          }
          ctx.globalAlpha = 1;

          if (zoom > 2.5 && seat.status !== "taken") {
            ctx.fillStyle = isSel ? "#ffffff" : "#18181b";
            ctx.font = "bold 5px Inter,sans-serif"; ctx.textAlign = "center";
            ctx.fillText(`${seat.col + 1}`, seat.x, seat.y + 2);
          }
        });
      }

      ctx.restore();

      if (povSeat && tooltipRef.current) {
        const r  = canvas.getBoundingClientRect();
        const tx = (povSeat.x * camRef.current.zoom + camRef.current.x) * (r.width  / canvas.width);
        const ty = (povSeat.y * camRef.current.zoom + camRef.current.y) * (r.height / canvas.height);
        tooltipRef.current.style.transform = `translate(calc(${tx}px - 50%), calc(${ty}px - 100% - 15px))`;
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  // selectedIds/hoveredSeatId/hoveredSection/priceMin/priceMax are read via refs — no dep needed
  }, [seats, povSeat, layoutType, sections, sectionTypeMap, overviewShapes]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = { isDragging: true, startX: e.clientX, startY: e.clientY, moved: false };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  };
  const handleMouseUp = () => {
    dragRef.current.isDragging = false;
    if (canvasRef.current) canvasRef.current.style.cursor = hoveredSeatId || hoveredSection ? "pointer" : "crosshair";
  };
  const handleMouseLeave = () => {
    dragRef.current.isDragging = false;
    setHoveredSeatId(null); setHoveredSection(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;

    if (dragRef.current.isDragging) {
      const dx = (e.clientX - dragRef.current.startX) * sx;
      const dy = (e.clientY - dragRef.current.startY) * sy;
      targetRef.current.x += dx; camRef.current.x += dx;
      targetRef.current.y += dy; camRef.current.y += dy;
      dragRef.current.startX = e.clientX; dragRef.current.startY = e.clientY;
      dragRef.current.moved = true;
      return;
    }

    const wx = ((e.clientX - rect.left) * sx - camRef.current.x) / camRef.current.zoom;
    const wy = ((e.clientY - rect.top)  * sy - camRef.current.y) / camRef.current.zoom;
    const isOverview = camRef.current.zoom < SECTION_ZOOM_THRESHOLD;

    if (isOverview) {
      let found: string | null = null;
      for (const sec of sections) {
        const shape = overviewShapes[sec.name];
        if (shape && pointInShape(wx, wy, shape) && sec.availableSeats > 0) { found = sec.name; break; }
      }
      if (found !== hoveredSection) { setHoveredSection(found); canvas.style.cursor = found ? "pointer" : "crosshair"; }
      if (hoveredSeatId) setHoveredSeatId(null);
    } else {
      if (hoveredSection) setHoveredSection(null);
      let found: string | null = null;
      for (const s of seats) {
        const dx = wx - s.x, dy = wy - s.y;
        if (dx * dx + dy * dy <= (s.radius + 3) ** 2) { found = s.id; break; }
      }
      if (found !== hoveredSeatId) {
        setHoveredSeatId(found);
        canvas.style.cursor = found && seats.find((s) => s.id === found)?.status === "available" ? "pointer" : "crosshair";
      }
    }
  };

  const handleClick = () => {
    if (dragRef.current.moved) { dragRef.current.moved = false; return; }
    const isOverview = camRef.current.zoom < SECTION_ZOOM_THRESHOLD;
    if (isOverview) {
      if (hoveredSection) { zoomToSection(hoveredSection); setActiveSection(hoveredSection); }
      return;
    }
    if (selectionMode === "auto") return;
    if (!hoveredSeatId) { setPovSeat(null); return; }
    const seat = seats.find((s) => s.id === hoveredSeatId);
    if (!seat || seat.status === "taken" || (seat.status === "held" && !selectedIds.has(seat.id))) return;
    setPovSeat(povSeat?.id === seat.id ? null : seat);
    const isRemoving = selectedIds.has(seat.id);
    setSelectedIds((prev) => { const next = new Set(prev); next.has(seat.id) ? next.delete(seat.id) : next.add(seat.id); return next; });
    // Tier 5: Emit lock/unlock over the network
    if (isRemoving) { emitUnlock(seat.id); } else { emitLock(seat.id); }
  };

  const handleDoubleClick = () => {
    if (camRef.current.zoom >= SECTION_ZOOM_THRESHOLD && hoveredSeatId) {
      const sec = seats.find((s) => s.id === hoveredSeatId)?.section;
      if (sec) { zoomToSection(sec); return; }
    }
    resetView();
  };

  useEffect(() => {
    onSelectionChange(seats.filter((s) => selectedIds.has(s.id)));
  }, [selectedIds, seats]); // eslint-disable-line react-hooks/exhaustive-deps

  const isTheater = layoutType === "theater";

  return (
    <div className="w-full bg-surface-dark-secondary rounded-2xl border border-gray-800 overflow-hidden" ref={containerRef}>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-800 flex-wrap">
        {activeSection ? (
          <button onClick={resetView} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={14} /> All sections
          </button>
        ) : isTheater ? (
          /* Concert tier legend */
          <div className="flex gap-3 text-xs font-medium text-gray-500 flex-wrap">
            {CONCERT_TIERS.map(({ type, label }) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: SECTION_COLOR[type].seat }} />
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block bg-[#3f3f46]" />Taken</span>
          </div>
        ) : (
          /* Arena/stadium legend */
          <div className="flex gap-3 text-xs font-medium text-gray-500 flex-wrap">
            {(["vip", "standard", "floor"] as SectionType[]).map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: SECTION_COLOR[t].seat }} />
                {t === "vip" ? "VIP" : t === "floor" ? "Floor / GA" : "General"}
              </span>
            ))}
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block bg-[#3f3f46]" />Taken</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: SELECTED_COLOR }} />Selected</span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${connected ? "text-emerald-400" : "text-amber-400"}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? "Live" : "Offline"}
          </div>
          <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg p-1 gap-1">
            <button onClick={() => { setSelectionMode("manual"); clearSelection(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${selectionMode === "manual" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
              <MousePointer2 size={12} /> Manual
            </button>
            <button onClick={() => { setSelectionMode("auto"); clearSelection(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${selectionMode === "auto" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
              <Sparkles size={12} /> Best Available
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-zinc-950/50 flex-wrap">
        <SlidersHorizontal size={13} className="text-gray-500 shrink-0" aria-hidden="true" />
        <span id="seatmap-price-label" className="text-xs font-semibold text-gray-400">Price:</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500" role="group" aria-labelledby="seatmap-price-label">
          <label htmlFor="seatmap-price-min" className="sr-only">Minimum price</label>
          <span aria-hidden="true">$</span>
          <input id="seatmap-price-min" type="number" value={priceMin} min={0} max={priceMax - 1}
            onChange={(e) => setPriceMin(Math.max(0, Number(e.target.value)))}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500" />
          <span className="text-gray-600" aria-hidden="true">—</span>
          <label htmlFor="seatmap-price-max" className="sr-only">Maximum price</label>
          <span aria-hidden="true">$</span>
          <input id="seatmap-price-max" type="number" value={priceMax} min={priceMin + 1}
            onChange={(e) => setPriceMax(Number(e.target.value))}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-indigo-500" />
        </div>
        {activeSection && <span className="ml-2 text-xs text-gray-500">Viewing: <span className="text-gray-300 font-medium">{activeSection}</span></span>}
        <span className="ml-auto text-xs text-gray-700 hidden sm:block">
          {!activeSection ? "Click a section to enter" : "Double-click empty area to go back"}
        </span>
      </div>

      {/* Auto bar */}
      {selectionMode === "auto" && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-indigo-600/10 flex-wrap">
          <Users size={14} className="text-indigo-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-300">Tickets:</span>
          <div className="flex gap-1">
            {[1,2,3,4,5,6,7,8].map((n) => (
              <button key={n} onClick={() => setTicketCount(n)}
                className={`w-7 h-7 rounded-md text-xs font-bold transition-all ${n === ticketCount ? "bg-indigo-600 text-white" : "bg-zinc-800 border border-zinc-700 text-gray-400 hover:text-white hover:bg-zinc-700"}`}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={handleAutoAssign}
            className="ml-auto flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">
            <Sparkles size={12} /> Find Best {ticketCount} Seat{ticketCount > 1 ? "s" : ""}
          </button>
          {selectedIds.size > 0 && (
            <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear</button>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="relative cursor-crosshair">
        {povSeat && (
          <div ref={tooltipRef} className="absolute top-0 left-0 z-20 pointer-events-auto" style={{ willChange: "transform" }}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl flex flex-col w-48 animate-in fade-in zoom-in duration-200">
              <div className="h-28 relative group overflow-hidden cursor-pointer bg-gradient-to-br from-violet-700 to-blue-700">
                <Image src="https://images.unsplash.com/photo-1540039155732-d6741492ba09?auto=format&fit=crop&q=80&w=400"
                  alt="Stage View" fill sizes="192px" className="object-cover opacity-75 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                  <span className="text-white font-bold text-xs tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">VIEW FROM SEAT</span>
                </div>
              </div>
              <div className="p-3 flex justify-between items-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-zinc-900 border-t border-l border-zinc-700 rotate-45 z-[-1]" />
                <div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{povSeat.section} · Row {povSeat.row + 1}</div>
                  <div className="text-lg font-bold text-white leading-none mt-0.5">${povSeat.price.toFixed(0)}</div>
                </div>
                <button className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-md hover:bg-zinc-200 transition-colors shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds((p) => { const n = new Set(p); n.add(povSeat.id); return n; });
                    setPovSeat(null);
                  }}>
                  {selectedIds.has(povSeat.id) ? "Added ✓" : "+ Add"}
                </button>
              </div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} width={1000} height={700}
          role="application"
          aria-label={
            activeSection
              ? `Interactive seat map, viewing section ${activeSection}. Click seats to select. ${selectedIds.size} selected.`
              : `Interactive seat map overview. ${sections.length} sections. Click a section to enter. ${selectedIds.size} selected.`
          }
          aria-describedby="seatmap-desc"
          tabIndex={0}
          onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick} onClick={handleClick}
          className="mx-auto block"
          style={{ width: "100%", maxWidth: "1000px", aspectRatio: "10/7" }} />
        <p id="seatmap-desc" className="sr-only">
          Drag to pan, scroll or pinch to zoom. Click a section to zoom in, then click individual seats to add them to your order. Use the price filter and auto-assign tools above for keyboard-friendly selection.
        </p>
        <div role="status" aria-live="polite" className="sr-only">
          {selectedIds.size === 0
            ? "No seats selected"
            : `${selectedIds.size} seat${selectedIds.size === 1 ? "" : "s"} selected`}
        </div>
      </div>
    </div>
  );
}
