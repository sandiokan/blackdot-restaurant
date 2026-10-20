import { useEffect, useRef, useState } from "react";
import { ImagePlus, Palette, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BrandMark from "@/components/BrandMark";
import { Panel, PrimaryButton, Segmented } from "@/components/shared/Primitives";
import { useRestaurantTheme } from "@/contexts/RestaurantThemeContext";
import type { RestaurantBrandingDraft } from "@/types/models";

const DEFAULT_DRAFT: RestaurantBrandingDraft = {
  displayName: "",
  logoPath: null,
  logoUrl: null,
  themeMode: "DARK",
  primaryColor: "#EEB36D",
  secondaryColor: "#F5CD96",
};

function toDraft(branding: RestaurantBrandingDraft | { displayName: string | null; logoPath: string | null; logoUrl: string | null; themeMode: "DARK" | "LIGHT"; primaryColor: string; secondaryColor: string }): RestaurantBrandingDraft {
  return {
    displayName: branding.displayName || "",
    logoPath: branding.logoPath,
    logoUrl: branding.logoUrl,
    themeMode: branding.themeMode,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
  };
}

export default function BrandingSettingsPanel({ restaurantName }: { restaurantName?: string }) {
  const { savedBranding, previewBranding, restoreBranding, saveBranding, resetBranding, loading, canManageBranding } = useRestaurantTheme();
  const [draft, setDraft] = useState<RestaurantBrandingDraft>(() => toDraft(savedBranding));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const restoreRef = useRef(restoreBranding);

  useEffect(() => {
    restoreRef.current = restoreBranding;
  }, [restoreBranding]);

  useEffect(() => {
    setDraft(toDraft(savedBranding));
    setLogoFile(null);
  }, [savedBranding]);

  useEffect(() => {
    previewBranding(draft);
  }, [draft, previewBranding]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    restoreRef.current();
  }, []);

  if (!canManageBranding) return null;

  function updateDraft<K extends keyof RestaurantBrandingDraft>(key: K, value: RestaurantBrandingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function clearObjectUrl() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }

  function handleLogoChange(file: File | undefined) {
    if (!file) return;
    const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error("Formato non supportato", { description: "Carica un logo PNG, JPEG o WebP." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo troppo grande", { description: "La dimensione massima è 2 MB." });
      return;
    }

    clearObjectUrl();
    const previewUrl = URL.createObjectURL(file);
    objectUrlRef.current = previewUrl;
    setLogoFile(file);
    setDraft((current) => ({ ...current, logoPath: null, logoUrl: previewUrl }));
  }

  function handleCancel() {
    clearObjectUrl();
    restoreBranding();
    setLogoFile(null);
    setDraft(toDraft(savedBranding));
  }

  function handleReset() {
    clearObjectUrl();
    setLogoFile(null);
    setDraft(DEFAULT_DRAFT);
  }

  function removeLogo() {
    clearObjectUrl();
    setLogoFile(null);
    setDraft((current) => ({ ...current, logoPath: null, logoUrl: null }));
  }

  const isDefaultTheme = draft.displayName.trim() === "" && !draft.logoPath && !logoFile && draft.themeMode === "DARK" && draft.primaryColor.toUpperCase() === DEFAULT_DRAFT.primaryColor && draft.secondaryColor.toUpperCase() === DEFAULT_DRAFT.secondaryColor;

  async function handleSave() {
    setSaving(true);
    try {
      if (isDefaultTheme) {
        await resetBranding();
        toast.success("Tema BLACKDOT ripristinato");
      } else {
        await saveBranding({ ...draft, displayName: draft.displayName.trim() }, logoFile);
        toast.success("Identità grafica salvata");
      }
      clearObjectUrl();
      setLogoFile(null);
    } catch (error) {
      toast.error("Salvataggio dell’identità grafica non riuscito", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  return <Panel className="branding-settings-panel">
    <div className="branding-settings-head">
      <div><span className="settings-kicker"><Palette size={14} />Identità grafica</span><h2>Personalizza il gestionale{restaurantName ? ` · ${restaurantName}` : ""}</h2><p>Le modifiche sono visibili in anteprima prima del salvataggio.</p></div>
      <div className="branding-live-preview"><BrandMark /><small>Anteprima live</small></div>
    </div>
    <div className="branding-settings-grid">
      <label className="field branding-name-field"><span>Nome commerciale</span><input value={draft.displayName} maxLength={60} placeholder="Es. Osteria delle Streghe" onChange={(event) => updateDraft("displayName", event.target.value)} disabled={loading || saving} /></label>
      <div className="field"><span>Modalità</span><Segmented options={["Scura", "Chiara"]} value={draft.themeMode === "DARK" ? "Scura" : "Chiara"} onChange={(value) => updateDraft("themeMode", value === "Chiara" ? "LIGHT" : "DARK")} /></div>
      <label className="field branding-color-field"><span>Colore principale</span><span><input type="color" value={draft.primaryColor} onChange={(event) => updateDraft("primaryColor", event.target.value.toUpperCase())} disabled={saving} /><b>{draft.primaryColor}</b></span></label>
      <label className="field branding-color-field"><span>Colore secondario</span><span><input type="color" value={draft.secondaryColor} onChange={(event) => updateDraft("secondaryColor", event.target.value.toUpperCase())} disabled={saving} /><b>{draft.secondaryColor}</b></span></label>
      <div className="field branding-logo-field"><span>Logo personalizzato</span><div className="branding-logo-controls">{draft.logoUrl ? <img src={draft.logoUrl} alt="Anteprima logo" /> : <div className="branding-logo-empty">Nessun logo</div>}<div><label className="button-ghost branding-upload-button"><ImagePlus size={15} />Carica logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleLogoChange(event.target.files?.[0])} disabled={saving} /></label><small>PNG, JPEG o WebP · massimo 2 MB</small>{draft.logoUrl && <button className="branding-remove-logo" onClick={removeLogo} disabled={saving}><Trash2 size={13} />Rimuovi logo</button>}</div></div></div>
    </div>
    <div className="branding-settings-actions"><button className="button-ghost" onClick={handleReset} disabled={saving}><RotateCcw size={15} />Ripristina BLACKDOT</button><div><button className="button-ghost" onClick={handleCancel} disabled={saving}>Annulla</button><PrimaryButton onClick={() => void handleSave()} disabled={saving || loading}><Save size={16} />{saving ? "Salvataggio..." : "Salva identità grafica"}</PrimaryButton></div></div>
  </Panel>;
}
