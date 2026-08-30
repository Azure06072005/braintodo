import { usePersonalization } from "../personalization/usePersonalization";
import { PALETTE_PRESETS, STAR_DENSITY_OPTIONS } from "../personalization/presets";
import { theme } from "../theme";

export default function PersonalizationPanel() {
  const { settings, updateSetting, resetSettings } = usePersonalization();

  return (
    <div>
      <Field label="Bảng màu">
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(PALETTE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => updateSetting("palette", key)}
              aria-pressed={settings.palette === key}
              style={{
                ...styles.swatchBtn,
                borderColor: settings.palette === key ? preset.accent : theme.panelBorder,
              }}
            >
              <span style={{ display: "flex", gap: 3 }}>
                {preset.nebula.map((c) => (
                  <span key={c} style={{ ...styles.swatchDot, background: c }} />
                ))}
              </span>
              <span style={{ fontSize: 11.5 }}>{preset.label}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Mật độ sao">
        <select
          value={settings.starDensity}
          onChange={(e) => updateSetting("starDensity", e.target.value)}
          style={styles.select}
        >
          {Object.entries(STAR_DENSITY_OPTIONS).map(([key, opt]) => (
            <option key={key} value={key}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={`Độ sáng viền node (${Math.round(settings.glowIntensity * 100)}%)`}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.glowIntensity}
          onChange={(e) => updateSetting("glowIntensity", Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </Field>

      <Field label="Hiệu ứng sao chổi trên liên kết">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={settings.showCometTrail}
            onChange={(e) => updateSetting("showCometTrail", e.target.checked)}
          />
          Hiện điểm sáng di chuyển trên các liên kết
        </label>
      </Field>

      <button type="button" onClick={resetSettings} style={styles.resetBtn}>
        Khôi phục mặc định
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11.5, color: theme.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const styles = {
  swatchBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "8px 6px",
    borderRadius: 8,
    border: `1.5px solid ${theme.panelBorder}`,
    background: "#1c2029",
    color: theme.textSecondary,
    cursor: "pointer",
  },
  swatchDot: { width: 8, height: 8, borderRadius: "50%" },
  select: {
    width: "100%",
    boxSizing: "border-box",
    background: "#1c2029",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "6px 9px",
    color: theme.textPrimary,
    fontSize: 12.5,
  },
  resetBtn: {
    width: "100%",
    background: "transparent",
    border: `1px solid ${theme.panelBorder}`,
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12.5,
    color: theme.textSecondary,
    cursor: "pointer",
  },
};
