import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from "@/components/ui/button";
import { X, CheckCircle2, AlertCircle, Volume2 } from "lucide-react";

export default function BarcodeScanner({ 
  onScan, 
  onClose, 
  continuous = false, 
  title = "Escanear Código", 
  subtitle = "Apunta la cámara al código QR o de barras",
  statusBadge = null,
  lastScanFeedback = null
}) {
  const scannerRef = useRef(null);
  const lastScannedTextRef = useRef('');
  const lastScanTimeRef = useRef(0);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 980; // High clear chime
      gain.gain.value = 0.2;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 140);
    } catch (e) {
      // Audio context not allowed or unsupported
    }
  };

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const handleDecoded = (decodedText) => {
      const now = Date.now();
      // Debounce the exact same code for 1.2s to prevent multiple triggers
      if (decodedText === lastScannedTextRef.current && now - lastScanTimeRef.current < 1200) {
        return;
      }
      lastScannedTextRef.current = decodedText;
      lastScanTimeRef.current = now;

      playBeep();

      if (!continuous) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch(console.error);
        }
      }

      onScan(decodedText);
    };

    const startCamera = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0
          },
          handleDecoded,
          () => {}
        );
      } catch (err) {
        console.error("Error al iniciar cámara trasera, probando fallback:", err);
        try {
          await html5QrCode.start(
            { facingMode: "user" },
            { fps: 12, qrbox: { width: 260, height: 260 } },
            handleDecoded,
            () => {}
          );
        } catch (fallbackErr) {
          console.error("Fallo total de cámara:", fallbackErr);
        }
      }
    };

    startCamera();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, continuous]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header Overlay */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <div>
          <h3 className="font-bold text-white text-base">{title}</h3>
          {statusBadge && <div className="mt-1">{statusBadge}</div>}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full text-white bg-white/20 hover:bg-white/40">
          <X className="w-6 h-6" />
        </Button>
      </div>
      
      {/* Camera Viewport */}
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
        <div id="reader" className="w-full max-w-lg"></div>
      </div>
      
      {/* Bottom Feedback Banner */}
      <div className="p-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent text-center absolute bottom-0 left-0 right-0 z-10 pb-10 space-y-3">
        {lastScanFeedback && (
          <div className="max-w-md mx-auto animate-in slide-in-from-bottom-2 duration-200">
            {lastScanFeedback}
          </div>
        )}
        <p className="text-white font-semibold text-sm">{subtitle}</p>
        <p className="text-white/60 text-xs">{continuous ? "Modo continuo activado • Escanea cada artículo consecutivamente" : "La detección es automática al enfocar"}</p>
      </div>
    </div>
  );
}
