/**
 * Theme tokens dùng chung toàn app. Không hardcode hex trong component —
 * import từ đây, để đổi theme chỉ cần sửa 1 chỗ.
 */
export const theme = {
  canvasBg: "#0b0e14",
  panelBg: "#12151c",
  panelBorder: "#22262f",
  edge: "#3a3d46",
  pulse: "#d4537e",
  textPrimary: "#e5e4dd",
  textSecondary: "#9c9a92",
  textMuted: "#6b6a64",
  accent: "#7f77dd",

  // Màu theo "độ sâu" của ý tưởng trong cây (gốc / con / cháu).
  // Node tự khai báo color riêng (từ backend) sẽ override giá trị này.
  depthColors: ["#7f77dd", "#1d9e75", "#d85a30", "#e59a2f"],
};

export function colorForDepth(depth) {
  return theme.depthColors[depth % theme.depthColors.length];
}