import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startCamera = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Forzar cámara trasera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().catch(console.error);
            }
            onScan(decodedText);
          },
          (errorMessage) => {
            // Ignorar errores de escaneo continuo
          }
        );
      } catch (err) {
        console.error("Error al iniciar cámara:", err);
        // Si falla 'environment', intentar sin restricción
        try {
          await html5QrCode.start(
            { facingMode: "user" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (html5QrCode.isScanning) html5QrCode.stop().catch(console.error);
              onScan(decodedText);
            },
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
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <h3 className="font-bold text-white">Escanear Código</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full text-white bg-white/20 hover:bg-white/40">
          <X className="w-6 h-6" />
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
        <div id="reader" className="w-full max-w-lg"></div>
      </div>
      
      <div className="p-6 bg-black/80 text-center absolute bottom-0 left-0 right-0 z-10 pb-12">
        <p className="text-white font-medium">Apunta la cámara al código QR.</p>
        <p className="text-white/60 text-sm mt-1">La detección es automática.</p>
      </div>
    </div>
  );
}
