import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const BarcodeWithText = ({ value, width = 2, height = 100, fontSize = 20, format = 'CODE128' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: format,
          width: width,
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
          margin: 10,
          marginTop: undefined,
          marginBottom: undefined,
          marginLeft: undefined,
          marginRight: undefined,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, width, height, fontSize, format]);

  if (!value) {
    return <div style={{ fontSize: 12, color: '#999' }}>No barcode</div>;
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default BarcodeWithText;
