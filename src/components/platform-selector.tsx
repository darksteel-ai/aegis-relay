"use client";

import { Camera, Check, Music2, PlaySquare } from "lucide-react";

export const composerPlatforms = [
  {
    id: "YOUTUBE",
    label: "YouTube Shorts",
    note: "Auto-publish when the scheduled time arrives.",
    icon: PlaySquare,
    accent: "text-red-300",
  },
  {
    id: "TIKTOK",
    label: "TikTok",
    note: "Saved for approval while platform access is pending.",
    icon: Music2,
    accent: "text-cyan-200",
  },
  {
    id: "INSTAGRAM",
    label: "Instagram Reels",
    note: "Saved for approval while platform access is pending.",
    icon: Camera,
    accent: "text-red-300",
  },
] as const;

export type ComposerPlatform = (typeof composerPlatforms)[number]["id"];

type PlatformSelectorProps = {
  disabled?: boolean;
  selected: ComposerPlatform[];
  onChange: (platforms: ComposerPlatform[]) => void;
};

export function PlatformSelector({
  disabled = false,
  selected,
  onChange,
}: PlatformSelectorProps) {
  function togglePlatform(platform: ComposerPlatform) {
    if (disabled) {
      return;
    }

    if (selected.includes(platform)) {
      onChange(selected.filter((item) => item !== platform));
      return;
    }

    onChange([...selected, platform]);
  }

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium text-white">Platforms</legend>
      <div className="grid gap-3 md:grid-cols-3">
        {composerPlatforms.map((platform) => {
          const checked = selected.includes(platform.id);

          return (
            <label
              key={platform.id}
              className="grid min-h-32 cursor-pointer gap-3 rounded-md border border-white/10 bg-black/25 p-4 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cyan-300 has-[:checked]:border-cyan-300/60 has-[:checked]:bg-cyan-300/10"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex items-center gap-2 font-medium text-white">
                  <platform.icon className={`h-4 w-4 ${platform.accent}`} aria-hidden="true" />
                  {platform.label}
                </span>
                <span className="relative grid h-5 w-5 shrink-0 place-items-center">
                  <input
                    className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-sm border border-white/20 bg-black/40 transition-colors checked:border-cyan-300 checked:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed"
                    checked={checked}
                    disabled={disabled}
                    type="checkbox"
                    value={platform.id}
                    onChange={() => togglePlatform(platform.id)}
                  />
                  <Check
                    className="pointer-events-none relative hidden h-3.5 w-3.5 text-black peer-checked:block"
                    aria-hidden="true"
                  />
                </span>
              </span>
              <span className="text-sm leading-5 text-slate-400">{platform.note}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
