export const drawFiscalImage = (text: string, qrImageUrl: string): string => {
  const lines = text
    .split("\n")
    .map((l) => {
      if (l === "======== КРАЈ ФИСКАЛНОГ РАЧУНА =========") {
        return "";
      }
      if (l.length < 40) {
        const pad = 40 - l.length;
        const left = Math.floor(pad / 2);
        const right = pad - left;
        return " ".repeat(left) + l + " ".repeat(right);
      }
      return l;
    })
    .filter((l) => l !== "");
  const imageHeight = 388;
  const lineHeight = 32;
  const fontHeight = 24;
  const padding = 90;

  const width = 600;
  const height = lines.length * lineHeight + imageHeight + padding;

  let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background-color:#FFFFFF">
  <style>
    .text {
      font: ${fontHeight}px monospace;
      fill: #000;
      text-align: center;
      white-space: pre;
    }
  </style>`;
  let y = fontHeight;
  for (const line of lines) {
    svg += `<text x="20" y="${y}" class="text">${line}</text>
    `;
    y += lineHeight;
  }
  svg += `<image href="${qrImageUrl}" height="388" width="388" x="106" y="${y}" />`;
  y += imageHeight + 50;
  svg += `<text x="20" y="${y}" class="text">======== КРАЈ ФИСКАЛНОГ РАЧУНА =========</text></svg>`;
  return svg;
};
