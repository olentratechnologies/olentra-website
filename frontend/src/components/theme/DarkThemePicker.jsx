"use client";

import { useId } from "react";
import { Palette, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { DARK_PRESETS, DEFAULT_DARK_PRESET } from "@/lib/theme/dark-presets.mjs";
import styles from "./DarkThemePicker.module.css";

function PresetPreview({ preset }) {
  return <span className={styles.preview} data-preview-preset={preset} aria-hidden="true">
    <span className={styles.miniSidebar}><i /><i /><i /><i /></span>
    <span className={styles.miniWorkspace}>
      <span className={styles.miniHeader}><i /><i /></span>
      <span className={styles.miniHero}><i /><i /></span>
      <span className={styles.miniCards}><i /><i /><i /></span>
      <span className={styles.miniChart}>
        <svg viewBox="0 0 200 35" preserveAspectRatio="none"><polyline points="0,28 30,15 65,23 98,7 128,18 164,10 200,25" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      </span>
    </span>
  </span>;
}

export function DarkThemePicker({ theme, darkPreset, chooseDarkPreset, message, triggerClassName = "", className = "" }) {
  const radioName = useId();
  return <Dialog.Root>
    <Dialog.Trigger asChild>
      <button type="button" className={[styles.trigger, triggerClassName].filter(Boolean).join(" ")} aria-label="Appearance" title="Choose a dark theme design">
        <Palette size={16} aria-hidden="true" /><span>Appearance</span>
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={[styles.dialog, className].filter(Boolean).join(" ")}>
        <div className={styles.heading}>
          <Dialog.Title>Appearance</Dialog.Title>
          <Dialog.Close asChild><button type="button" className={styles.close} aria-label="Close appearance"><X size={19} aria-hidden="true" /></button></Dialog.Close>
        </div>
        <div className={styles.body}>
          <Dialog.Description className={styles.description}>Choose a dark design. Your choice is applied immediately and saved in this browser.</Dialog.Description>
          <fieldset className={styles.choices}>
            <legend className={styles.legend}>Dark designs</legend>
            <div className={styles.grid}>
              {DARK_PRESETS.map(preset => <label key={preset.id} className={styles.option} data-selected={darkPreset === preset.id}>
                <PresetPreview preset={preset.id} />
                <span className={styles.optionHeading}>
                  <span>{preset.label}{preset.id === DEFAULT_DARK_PRESET && <span className={styles.defaultBadge}>Default</span>}</span>
                  <input
                    type="radio" name={radioName} value={preset.id}
                    checked={darkPreset === preset.id} aria-label={preset.label}
                    onChange={() => chooseDarkPreset(preset.id)}
                    onClick={() => { if (theme !== "dark" && darkPreset === preset.id) chooseDarkPreset(preset.id); }}
                  />
                </span>
                <span className={styles.optionDescription}>{preset.description}</span>
              </label>)}
            </div>
          </fieldset>
          <p className={styles.message} role="status">{message || (theme === "light" ? "Light mode stays as it is. Select a design to switch to dark mode." : "Switching to light mode keeps your selected dark design for next time.")}</p>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
