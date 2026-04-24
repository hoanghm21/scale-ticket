export type VenueSectionType = "vip" | "floor" | "standard" | "lawn" | "bleachers";

export interface BoundingBox {
  x: number; y: number; w: number; h: number;
}

export interface VenueSectionShapeRect extends BoundingBox {
  kind: "rect";
}

export interface VenueSectionShapeArc {
  kind: "arc"; 
  cx: number; cy: number; 
  r1: number; r2: number; 
  a0: number; a1: number;
}

export interface VenueSectionShapePoly {
  kind: "poly"; 
  points: [number, number][];
}

export type VenueSectionShape = VenueSectionShapeRect | VenueSectionShapeArc | VenueSectionShapePoly;

export interface VenueSection {
  id: string; 
  name: string; 
  type: VenueSectionType; 
  shape: VenueSectionShape; 
  
  // Procedural seat generation setup
  rows: number;
  seatsPerRow: number;
  basePrice: number;
  
  curveFactor?: number;
}

export interface VenueLayoutSchema {
  id: string;
  name: string;
  category: "stadium" | "arena" | "theater" | "festival";
  sections: VenueSection[];
}
