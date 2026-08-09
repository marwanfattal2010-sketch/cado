import { useMemo } from "react";
import qrcode from "qrcode-generator";

/**
 * Renders a QR code in the browser, with no network request.
 *
 * This replaced an <img> pointing at api.qrserver.com. That URL carried the
 * gift card's redemption link — and therefore the code itself — in a query
 * string to a third party, where it lands in their access logs. The code is
 * the only secret a gift card has, so it must never leave CADO.
 */
export function QrCode({
  value,
  size = 220,
  className,
  alt = "QR code",
}: {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const src = useMemo(() => {
    // Type 0 = pick the smallest version that fits. 'M' correction survives a
    // phone camera at an angle, which is how these actually get scanned.
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    // A GIF data: URL, which the CSP already allows via `img-src 'self' data:`.
    // cellSize 4 / margin 2 renders crisply well past the display size.
    return qr.createDataURL(4, 2);
  }, [value]);

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
