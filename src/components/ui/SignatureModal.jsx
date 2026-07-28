import React, { useRef, useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { X, PenTool, CheckCircle2 } from "lucide-react"

export default function SignatureModal({ onSign, onClose, title = "Firma Autógrafa" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set actual size in memory (scaled to account for CSS sizing)
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000000';
    }
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    setIsEmpty(false);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSign(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <PenTool className="w-5 h-5 text-primary" />
            {title}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Firme en el recuadro inferior para aceptar el resguardo del inventario.
          </p>
          
          <div className="relative border-2 border-dashed border-input rounded-xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="w-full h-48 touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {isEmpty && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-muted-foreground/30 font-medium">
                Área de firma
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={clearCanvas}>
              Limpiar
            </Button>
            <Button className="flex-1 font-bold" disabled={isEmpty} onClick={handleSave}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
