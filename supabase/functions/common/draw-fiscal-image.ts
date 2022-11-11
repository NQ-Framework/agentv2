import { createCanvas, loadImage } from "../deps.ts";

export const drawFiscalImage = async (
  text: string,
  qrImageUrl: string
): Promise<string> => {
  const lines = text.split("\n").map((l) => {
    if (l.length < 40) {
      const pad = 40 - l.length;
      const left = Math.floor(pad / 2);
      const right = pad - left;
      return " ".repeat(left) + l + " ".repeat(right);
    }
    return l;
  });

  const image = await loadImage(qrImageUrl);
  const lineHeight = 32;
  const fontHeight = 24;
  const padding = 90;

  const width = 600;
  const height = lines.length * lineHeight + image.height() + padding;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "black";
  ctx.font = `${fontHeight}px monospace`;
  ctx.textAlign = "left";
  let y = fontHeight;
  for (const line of lines) {
    ctx.fillText(line, 20, y);
    y += lineHeight;
  }
  ctx.drawImage(image, (width - image.width()) / 2, y);
  y += image.height() + 50;
  ctx.fillText("======== КРАЈ ФИСКАЛНОГ РАЧУНА =========", 20, y);
  return canvas.toDataURL("image/jpg", 0.4);
};
