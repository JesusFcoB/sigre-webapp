import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = React.useRef(null);

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scannerRef.current.render(
        (decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
          }
          onScan(decodedText);
        },
        (errorMessage) => {
          // Ignorar errores de frame no encontrado
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold">Escanear Código</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4 bg-black">
          <div id="reader" className="w-full text-black"></div>
        </div>
        <div className="p-4 bg-muted/30 text-center text-sm text-muted-foreground">
          Apunta la cámara al código de barras o QR.
        </div>
      </div>
    </div>
  );
}
