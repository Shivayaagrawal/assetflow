"use client";

import QRCode from "react-qr-code";

export function AssetQRCode({ assetTag }: { assetTag: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #d0d7de",
        borderRadius: 8,
        display: "inline-block",
        padding: 12,
      }}
    >
      <QRCode
        aria-label={`QR code for asset ${assetTag}`}
        size={128}
        value={assetTag}
      />
      <p className="muted" style={{ fontSize: 12, margin: "8px 0 0", textAlign: "center" }}>
        {assetTag}
      </p>
    </div>
  );
}
