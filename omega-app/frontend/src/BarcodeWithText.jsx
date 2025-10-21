import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeWithText = ({ value, width = 2, height = 100, fontSize = 20, format = 'CODE128', responsive = false }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        // Se responsive è true, calcola width in base al contenitore
        let effectiveWidth = width;
        if (responsive && containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth;
          // Calcola width ottimale per fittare nel contenitore
          // Lunghezza tipica CODE128: ~11 caratteri * 11 barre per carattere = ~121 barre
          const estimatedBars = value.length * 11;
          effectiveWidth = Math.max(0.8, (containerWidth - 20) / estimatedBars); // margin 20px totali
        }
        
        JsBarcode(canvasRef.current, value, {
          format: format,
          width: effectiveWidth,
          height: height,
          displayValue: true,
          fontSize: fontSize,
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2,
          fontOptions: "",
          font: "monospace",
          background: "#ffffff",
          lineColor: "#000000",
          margin: responsive ? 5 : 10,
          marginTop: undefined,
          marginBottom: undefined,
          marginLeft: undefined,
          marginRight: undefined,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, width, height, fontSize, format, responsive]);

  if (!value) {
    return <div style={{ fontSize: 12, color: '#999' }}>No barcode</div>;
  }

  return (
    <div ref={containerRef} style={{ display: 'inline-block', width: responsive ? '100%' : 'auto', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto' }} />
    </div>
  );
};

export default BarcodeWithText;
