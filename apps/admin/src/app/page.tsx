"use client";

import React, { useState, useRef, useEffect } from "react";
import { MousePointer2, Square, Hexagon, Save, Trash2, Code2 } from "lucide-react";
import { VenueSection, VenueSectionType, VenueLayoutSchema } from "@scale-ticket/shared-types";

const generateId = () => Math.random().toString(36).substring(2, 9);

type DrawingMode = "select" | "rect" | "poly";

export default function StudioPage() {
  const [schema, setSchema] = useState<VenueLayoutSchema>({
    id: generateId(),
    name: "New Stadium Project",
    category: "stadium",
    sections: [],
  });
  
  const [mode, setMode] = useState<DrawingMode>("select");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [previewJson, setPreviewJson] = useState(false);
  
  const [isDrawingRect, setIsDrawingRect] = useState(false);
  const [rectStart, setRectStart] = useState<{x: number, y: number} | null>(null);
  const [polyPoints, setPolyPoints] = useState<[number, number][]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const getMousePos = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    if (mode === "rect") {
      setIsDrawingRect(true);
      setRectStart(pos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mode === "rect" && isDrawingRect && rectStart) {
      const pos = getMousePos(e);
      const w = pos.x - rectStart.x;
      const h = pos.y - rectStart.y;
      
      const normalizedX = w < 0 ? pos.x : rectStart.x;
      const normalizedY = h < 0 ? pos.y : rectStart.y;
      const normalizedW = Math.abs(w);
      const normalizedH = Math.abs(h);

      if (normalizedW > 10 && normalizedH > 10) {
        const newSection: VenueSection = {
          id: generateId(),
          name: `Section ${schema.sections.length + 1}`,
          type: "standard",
          shape: { kind: "rect", x: normalizedX, y: normalizedY, w: normalizedW, h: normalizedH },
          rows: 10,
          seatsPerRow: 20,
          basePrice: 50,
        };
        setSchema({ ...schema, sections: [...schema.sections, newSection] });
        setSelectedSectionId(newSection.id);
      }
      setIsDrawingRect(false);
      setRectStart(null);
      setMode("select");
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (mode === "poly") {
      const pos = getMousePos(e);
      setPolyPoints([...polyPoints, [pos.x, pos.y]]);
    } else if (mode === "select") {
       // Note: Point in polygon selection omitted for brevity, user uses sidebar or clicks nearby.
    }
  };
  
  const handleDoubleClick = () => {
    if (mode === "poly" && polyPoints.length >= 3) {
      const newSection: VenueSection = {
        id: generateId(),
        name: `Poly Section ${schema.sections.length + 1}`,
        type: "vip",
        shape: { kind: "poly", points: polyPoints },
        rows: 5,
        seatsPerRow: 10,
        basePrice: 150,
      };
      setSchema({ ...schema, sections: [...schema.sections, newSection] });
      setSelectedSectionId(newSection.id);
      setPolyPoints([]);
      setMode("select");
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    let animId: number;
    const draw = () => {
      ctx.clearRect(0,0, canvas.width, canvas.height);
      
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      for (let i=0; i<canvas.width; i+=50) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
      for (let j=0; j<canvas.height; j+=50) { ctx.beginPath(); ctx.moveTo(0,j); ctx.lineTo(canvas.width,j); ctx.stroke(); }
      
      schema.sections.forEach(sec => {
        const isSel = sec.id === selectedSectionId;
        ctx.fillStyle = isSel ? "rgba(223, 255, 0, 0.2)" : "rgba(255, 255, 255, 0.05)";
        ctx.strokeStyle = isSel ? "#DFFF00" : "#666";
        ctx.lineWidth = isSel ? 2 : 1;
        
        ctx.beginPath();
        if (sec.shape.kind === "rect") {
          ctx.rect(sec.shape.x, sec.shape.y, sec.shape.w, sec.shape.h);
        } else if (sec.shape.kind === "poly" && sec.shape.points.length > 0) {
          ctx.moveTo(sec.shape.points[0][0], sec.shape.points[0][1]);
          for(let i=1; i<sec.shape.points.length; i++) ctx.lineTo(sec.shape.points[i][0], sec.shape.points[i][1]);
          ctx.closePath();
        }
        ctx.fill(); ctx.stroke();
        
        if (sec.shape.kind === "rect") {
          ctx.fillStyle = isSel ? "#DFFF00" : "#FFF";
          ctx.font = "12px sans-serif";
          ctx.fillText(sec.name, sec.shape.x + 5, sec.shape.y + 16);
        }
      });
      
      if (polyPoints.length > 0) {
         ctx.strokeStyle = "#DFFF00";
         ctx.beginPath();
         ctx.moveTo(polyPoints[0][0], polyPoints[0][1]);
         for (let i=1; i<polyPoints.length; i++) ctx.lineTo(polyPoints[i][0], polyPoints[i][1]);
         ctx.stroke();
         polyPoints.forEach(([x,y]) => {
           ctx.beginPath(); ctx.arc(x,y,4, 0, Math.PI*2); ctx.fillStyle="#DFFF00"; ctx.fill();
         });
      }
      
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [schema, selectedSectionId, polyPoints]);

  const selectedSection = schema.sections.find(s => s.id === selectedSectionId);

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white font-sans">
      <div className="w-16 border-r border-[#333] flex flex-col items-center py-4 space-y-4 bg-[#0A0A0A]">
        <button className={`p-3 rounded-md hover:bg-[#222] ${mode==="select" && "bg-[#222] text-[#DFFF00]"}`} onClick={()=>setMode("select")}><MousePointer2 size={20}/></button>
        <button className={`p-3 rounded-md hover:bg-[#222] ${mode==="rect" && "bg-[#222] text-[#DFFF00]"}`} onClick={()=>setMode("rect")}><Square size={20}/></button>
        <button className={`p-3 rounded-md hover:bg-[#222] ${mode==="poly" && "bg-[#222] text-[#DFFF00]"}`} onClick={()=>setMode("poly")}><Hexagon size={20}/></button>
        <div className="flex-1" />
        <button className="p-3 rounded-md hover:bg-[#222] text-gray-400" onClick={()=>setPreviewJson(!previewJson)}><Code2 size={20}/></button>
      </div>

      <div className="flex-1 relative bg-[#111]">
        {mode === "poly" && <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-xs border border-[#333] text-[#DFFF00]">Double-click to close polygon</div>}
        <canvas 
          ref={canvasRef}
          width={1200}
          height={800}
          className={`w-full h-full ${mode !== "select" ? "cursor-crosshair" : "cursor-default"}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        />
        
        {previewJson && (
          <div className="absolute inset-0 bg-black/90 p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#DFFF00]">VenueSchema JSON Export</h2>
              <button className="bg-[#DFFF00] text-black px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-sm"><Save size={16}/> Save to Database</button>
            </div>
            <pre className="text-sm font-mono text-gray-300">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="w-80 border-l border-[#333] bg-[#0A0A0A] p-6 overflow-y-auto hidden sm:block">
        <h2 className="text-lg font-bold mb-6 pb-4 border-b border-[#333]">Project Info</h2>
        <div className="space-y-4 mb-10">
           <div>
             <label className="text-xs text-gray-400 block mb-1">Venue Name</label>
             <input type="text" className="w-full bg-black border border-[#333] px-3 py-2 text-sm outline-none focus:border-[#DFFF00]" value={schema.name} onChange={(e)=>setSchema({...schema, name: e.target.value})} />
           </div>
           <div>
             <label className="text-xs text-gray-400 block mb-1">Category</label>
             <input type="text" className="w-full bg-black border border-[#333] px-3 py-2 text-sm outline-none focus:border-[#DFFF00]" value={schema.category} readOnly />
           </div>
        </div>

        <h2 className="text-lg font-bold mb-6 pb-4 border-b border-[#333]">Section Properties</h2>
        {selectedSection ? (
          <div className="space-y-4 transition-all animate-in fade-in slide-in-from-right-4">
            <div>
               <label className="text-xs text-gray-400 block mb-1">Section Name</label>
               <input type="text" className="w-full bg-black border border-[#333] px-3 py-2 text-sm outline-none focus:border-[#DFFF00]" value={selectedSection.name} 
                 onChange={(e)=>setSchema({
                   ...schema, 
                   sections: schema.sections.map(s => s.id === selectedSection.id ? {...s, name: e.target.value} : s)
                 })} 
               />
             </div>
             <div>
               <label className="text-xs text-gray-400 block mb-1">Type Variant</label>
               <input type="text" className="w-full bg-black border border-[#333] px-3 py-2 text-sm outline-none focus:border-[#DFFF00]" value={selectedSection.type} 
                 onChange={(e)=>setSchema({
                   ...schema, 
                   sections: schema.sections.map(s => s.id === selectedSection.id ? {...s, type: e.target.value as VenueSectionType} : s)
                 })} 
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-xs text-gray-400 block mb-1">Rows</label>
                 <input type="number" className="w-full bg-black border border-[#333] px-3 py-2 text-sm outline-none focus:border-[#DFFF00]" value={selectedSection.rows} 
                   onChange={(e)=>setSchema({
                     ...schema, 
                     sections: schema.sections.map(s => s.id === selectedSection.id ? {...s, rows: parseInt(e.target.value)} : s)
                   })} 
                 />
               </div>
               <div>
                 <label className="text-xs text-gray-400 block mb-1">Seats / Row</label>
                 <input type="number" className="w-full bg-black border border-[#333] px-3 py-2 text-sm outline-none focus:border-[#DFFF00]" value={selectedSection.seatsPerRow} 
                   onChange={(e)=>setSchema({
                     ...schema, 
                     sections: schema.sections.map(s => s.id === selectedSection.id ? {...s, seatsPerRow: parseInt(e.target.value)} : s)
                   })} 
                 />
               </div>
             </div>
             <div>
               <label className="text-xs text-gray-400 block mb-1">Base Price ($)</label>
               <input type="number" className="w-full bg-black border border-[#333] px-3 py-2 text-sm outline-none focus:border-[#DFFF00]" value={selectedSection.basePrice} 
                 onChange={(e)=>setSchema({
                   ...schema, 
                   sections: schema.sections.map(s => s.id === selectedSection.id ? {...s, basePrice: parseInt(e.target.value)} : s)
                 })} 
               />
             </div>

             <div className="pt-6">
                <button 
                  className="w-full border border-red-500/50 text-red-400 py-2 text-sm flex justify-center items-center gap-2 hover:bg-red-500/10 transition-colors"
                  onClick={() => {
                    setSchema({...schema, sections: schema.sections.filter(s => s.id !== selectedSection.id)});
                    setSelectedSectionId(null);
                  }}
                >
                  <Trash2 size={16} /> Delete Section
                </button>
             </div>
          </div>
        ) : (
          <div className="text-gray-500 text-sm text-center py-10 border border-dashed border-[#333]">
            Select a shape on the canvas to configure parameters.
          </div>
        )}
      </div>
    </div>
  );
}
