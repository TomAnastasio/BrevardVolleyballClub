import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildJoinUrl } from "../../lib/joinLink.js";

export default function SignUpQrCodeView() {
  const joinUrl = buildJoinUrl(window.location.origin, import.meta.env.BASE_URL);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(joinUrl, { width: 640, margin: 2, errorCorrectionLevel: "M" })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch((e) => {
        console.error("Failed to generate sign-up QR code:", e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  return (
    <div className="flex flex-1 flex-col items-center gap-4 p-4 text-center">
      <p className="m-0 max-w-80 text-sm text-muted">
        Have a new player point their phone camera here. It takes them straight to Google sign-in, which creates their
        player profile.
      </p>
      <div className="flex aspect-square w-[min(85vw,360px)] items-center justify-center rounded-2xl bg-white p-3">
        {qrDataUrl && <img src={qrDataUrl} alt="Sign-up QR code" className="h-full w-full [image-rendering:pixelated]" />}
        {failed && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            Couldn't generate the QR code.
          </p>
        )}
      </div>
      <p className="m-0 text-xs text-muted">
        Camera not cooperating? Have them visit
        <br />
        <span className="font-mono text-foreground">{joinUrl}</span>
      </p>
    </div>
  );
}
