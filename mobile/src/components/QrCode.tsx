import { useMemo } from 'react';
import QRCode from 'qrcode';
import Svg, { Path, Rect } from 'react-native-svg';

// @MOB-124 QR code drawn with react-native-svg: one path of dark modules on a white square with
// the standard 4-module quiet zone, so any scanner reads it.
export function QrCode({ value, size = 180 }: { value: string; size?: number }) {
  const { path, count } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    let d = '';
    for (let row = 0; row < n; row += 1) {
      for (let col = 0; col < n; col += 1) {
        if (qr.modules.get(row, col)) d += `M${col + 4},${row + 4}h1v1h-1z`;
      }
    }
    return { path: d, count: n + 8 };
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`} accessibilityLabel="QR">
      <Rect x={0} y={0} width={count} height={count} fill="#FFFFFF" />
      <Path d={path} fill="#000000" />
    </Svg>
  );
}
