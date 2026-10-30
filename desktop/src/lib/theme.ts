/** Keep accent roles legible against white and the tinted navigation surface. */
export function accessibleAccent(seed: string): string {
  const hex = /^#[0-9a-f]{6}$/i.test(seed) ? seed : "#3e6655";
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminance = () =>
    rgb
      .map((n) => {
        const c = n / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      })
      .reduce((v, c, i) => v + c * [0.2126, 0.7152, 0.0722][i], 0);
  while (luminance() > 0.14)
    for (let i = 0; i < 3; i++) rgb[i] = Math.floor(rgb[i] * 0.9);
  return "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("");
}
