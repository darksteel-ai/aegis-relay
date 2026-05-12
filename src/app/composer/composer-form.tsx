"use client";

import { AlertCircle, CalendarPlus, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  PlatformSelector,
  type ComposerPlatform,
} from "@/components/platform-selector";
import { VideoUpload, type UploadedVideo } from "@/components/video-upload";

type SubmitState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function ComposerForm() {
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [platforms, setPlatforms] = useState<ComposerPlatform[]>(["YOUTUBE"]);
  const [baseCaption, setBaseCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [submitState, setSubmitState] = useState<SubmitState>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const captionCharacters = baseCaption.length;
  const canSubmit = useMemo(() => {
    return Boolean(video && baseCaption.trim() && scheduledAt && timezone && platforms.length);
  }, [baseCaption, platforms.length, scheduledAt, timezone, video]);

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!video) {
      setSubmitState({ type: "error", message: "Upload a video before scheduling." });
      return;
    }

    setIsSubmitting(true);
    setSubmitState({ type: "idle" });

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCaption,
          scheduledAt: new Date(scheduledAt).toISOString(),
          timezone,
          platforms,
          video: {
            storageKey: video.key,
            fileName: video.fileName,
            mimeType: video.contentType,
            sizeBytes: video.sizeBytes,
            width: video.width,
            height: video.height,
            duration: video.durationSeconds,
          },
        }),
      });

      if (!response.ok) {
        const error = await readErrorMessage(response);
        throw new Error(error);
      }

      setSubmitState({
        type: "success",
        message: "Post scheduled. YouTube will publish automatically; TikTok and Instagram are saved for approval.",
      });
      setBaseCaption("");
      setScheduledAt("");
      setPlatforms(["YOUTUBE"]);
      setVideo(null);
    } catch (error) {
      setSubmitState({
        type: "error",
        message: error instanceof Error ? error.message : "Post could not be scheduled.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={submitPost}>
      <VideoUpload
        disabled={isSubmitting}
        onUploaded={(uploadedVideo) => {
          setVideo(uploadedVideo);
          setSubmitState({ type: "idle" });
        }}
        onError={(message) => setSubmitState({ type: "error", message })}
      />

      {video ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="break-all">Ready to schedule {video.fileName}.</p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <label className="text-sm font-medium text-neutral-950" htmlFor="baseCaption">
            Caption
          </label>
          <span className="text-xs text-neutral-500">{captionCharacters}/2200</span>
        </div>
        <textarea
          className="min-h-36 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-6 text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          id="baseCaption"
          maxLength={2200}
          required
          value={baseCaption}
          onChange={(event) => setBaseCaption(event.target.value)}
          placeholder="Write the caption that every selected platform should start from."
        />
      </div>

      <PlatformSelector
        disabled={isSubmitting}
        selected={platforms}
        onChange={setPlatforms}
      />

      <div className="grid gap-4 rounded-md border border-neutral-200 bg-white p-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-neutral-950" htmlFor="scheduledAt">
          Schedule time
          <input
            className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm font-normal text-neutral-950 outline-none transition-colors focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            id="scheduledAt"
            required
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-neutral-950" htmlFor="timezone">
          Timezone
          <input
            className="h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm font-normal text-neutral-950 outline-none transition-colors focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            id="timezone"
            required
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          />
        </label>
      </div>

      {submitState.type !== "idle" ? (
        <div
          className={
            submitState.type === "success"
              ? "flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              : "flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          }
          role="status"
        >
          {submitState.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <p>{submitState.message}</p>
        </div>
      ) : null}

      <button
        className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSubmit || isSubmitting}
        type="submit"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        {isSubmitting ? "Scheduling..." : "Schedule post"}
      </button>
    </form>
  );
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Post could not be scheduled.";
  } catch {
    return "Post could not be scheduled.";
  }
}

function getDefaultTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
