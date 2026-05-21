"use client";

import { AlertCircle, CalendarPlus, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  PlatformSelector,
  type ComposerPlatform,
} from "@/components/platform-selector";
import { VideoUpload, type UploadedVideo } from "@/components/video-upload";

type SubmitState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type AiSuggestion = {
  title: string;
  hashtags: string[];
  rationale: string;
};

type AiPlatformSignal = {
  platform: string;
  status: "available" | "limited" | "unavailable";
  recentItems: unknown[];
  notes: string[];
};

type ComposerConnectedAccount = {
  id: string;
  platform: ComposerPlatform;
  accountName: string;
  externalId: string;
  status: string;
};

export function ComposerForm({
  connectedAccounts = [],
}: {
  connectedAccounts?: ComposerConnectedAccount[];
}) {
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [platforms, setPlatforms] = useState<ComposerPlatform[]>(["YOUTUBE"]);
  const [accountIdsByPlatform, setAccountIdsByPlatform] = useState<
    Partial<Record<ComposerPlatform, string[]>>
  >(() => getInitialAccountSelections(connectedAccounts));
  const [baseCaption, setBaseCaption] = useState("");
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [submitState, setSubmitState] = useState<SubmitState>({ type: "idle" });
  const [aiState, setAiState] = useState<SubmitState>({ type: "idle" });
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiPlatformSignals, setAiPlatformSignals] = useState<AiPlatformSignal[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const captionCharacters = baseCaption.length;
  const youtubeTitleCharacters = youtubeTitle.length;
  const hashtagCharacters = hashtags.length;
  const hasRequiredMetadata = Boolean(video?.width && video.height && video.durationSeconds);
  const submitBlockedReason = getSubmitBlockedReason({
    video,
    hasRequiredMetadata,
    baseCaption,
    scheduledAt,
    timezone,
    platforms,
  });
  const canSubmit = !submitBlockedReason;
  const scheduleBlockedCopy =
    submitState.type === "success" ? "Ready for the next post." : submitBlockedReason;

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!video) {
      setSubmitState({ type: "error", message: "Upload a video before scheduling." });
      return;
    }

    setIsSubmitting(true);
    setSubmitState({ type: "idle" });

    try {
      const scheduleDate = new Date(scheduledAt);

      if (Number.isNaN(scheduleDate.getTime())) {
        throw new Error("Schedule time must be a valid date and time.");
      }

      if (scheduleDate <= new Date()) {
        throw new Error("Schedule time must be in the future.");
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseCaption,
          youtubeTitle,
          hashtags,
          scheduledAt: scheduleDate.toISOString(),
          timezone,
          platforms,
          accountIdsByPlatform,
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
      setYoutubeTitle("");
      setHashtags("");
      setScheduledAt("");
      setPlatforms(["YOUTUBE"]);
      setAccountIdsByPlatform(getInitialAccountSelections(connectedAccounts));
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

  async function optimizeMetadata() {
    if (!baseCaption.trim()) {
      setAiState({ type: "error", message: "Add a caption before optimizing." });
      return;
    }

    setIsOptimizing(true);
    setAiState({ type: "idle" });

    try {
      const response = await fetch("/api/ai/optimize-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: baseCaption,
          youtubeTitle,
          hashtags,
        }),
      });

      if (!response.ok) {
        const error = await readErrorMessage(response);
        throw new Error(error);
      }

      const body = (await response.json()) as {
        suggestions?: AiSuggestion[];
        basedOn?: { platforms?: AiPlatformSignal[] };
      };
      setAiSuggestions(body.suggestions ?? []);
      setAiPlatformSignals(body.basedOn?.platforms ?? []);
      setAiState({
        type: "success",
        message: "AI suggestions are ready.",
      });
    } catch (error) {
      setAiSuggestions([]);
      setAiPlatformSignals([]);
      setAiState({
        type: "error",
        message: error instanceof Error ? error.message : "AI optimization failed.",
      });
    } finally {
      setIsOptimizing(false);
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
        <div className="flex items-center gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="break-all">Ready to schedule {video.fileName}.</p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <label className="text-sm font-medium text-white" htmlFor="baseCaption">
            Caption
          </label>
          <span className="text-xs text-slate-500">{captionCharacters}/2200</span>
        </div>
        <textarea
          className="studio-input min-h-36 w-full resize-y px-3 py-2 text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          id="baseCaption"
          maxLength={2200}
          required
          value={baseCaption}
          onChange={(event) => setBaseCaption(event.target.value)}
          placeholder="Write the caption that every selected platform should start from."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
        <div className="grid gap-2">
          <div className="flex items-end justify-between gap-3">
            <label className="text-sm font-medium text-white" htmlFor="youtubeTitle">
              YouTube title
            </label>
            <span className="text-xs text-slate-500">{youtubeTitleCharacters}/100</span>
          </div>
          <input
            className="studio-input h-10 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            id="youtubeTitle"
            maxLength={100}
            value={youtubeTitle}
            onChange={(event) => setYoutubeTitle(event.target.value)}
            placeholder="Optional. If blank, YouTube uses the caption."
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-end justify-between gap-3">
            <label className="text-sm font-medium text-white" htmlFor="hashtags">
              Hashtags
            </label>
            <span className="text-xs text-slate-500">{hashtagCharacters}/500</span>
          </div>
          <input
            className="studio-input h-10 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            id="hashtags"
            maxLength={500}
            value={hashtags}
            onChange={(event) => setHashtags(event.target.value)}
            placeholder="#shorts #creator #launch"
          />
        </div>
      </div>

      <div className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.045] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">AI metadata optimizer</p>
            <p className="mt-1 text-sm text-slate-400">
              Suggest titles and hashtags using this caption plus connected platform data.
            </p>
          </div>
          <button
            className="studio-button-secondary w-fit disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isOptimizing || isSubmitting || !baseCaption.trim()}
            type="button"
            onClick={optimizeMetadata}
          >
            <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden="true" />
            {isOptimizing ? "Optimizing..." : "Optimize with AI"}
          </button>
        </div>

        {aiState.type !== "idle" ? (
          <div
            className={
              aiState.type === "success"
                ? "mt-4 flex items-start gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
                : "mt-4 flex items-start gap-2 rounded-md border border-red-300/40 bg-red-400/10 px-4 py-3 text-sm text-red-100"
            }
            role="status"
          >
            {aiState.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <p>{aiState.message}</p>
          </div>
        ) : null}

        {aiSuggestions.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {aiPlatformSignals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aiPlatformSignals.map((signal) => (
                  <span
                    className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-slate-300"
                    key={signal.platform}
                    title={signal.notes.join(" ")}
                  >
                    {signal.platform}: {signal.status}
                    {signal.recentItems.length ? ` (${signal.recentItems.length})` : ""}
                  </span>
                ))}
              </div>
            ) : null}

            {aiSuggestions.map((suggestion) => (
              <div
                className="rounded-md border border-white/10 bg-black/25 p-4"
                key={`${suggestion.title}-${suggestion.hashtags.join("-")}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-white">
                      {suggestion.title}
                    </p>
                    <p className="mt-2 break-words text-sm text-cyan-100">
                      {suggestion.hashtags.join(" ")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {suggestion.rationale}
                    </p>
                  </div>
                  <button
                    className="studio-button-primary h-9 w-fit px-3"
                    type="button"
                    onClick={() => {
                      setYoutubeTitle(suggestion.title);
                      setHashtags(suggestion.hashtags.join(" "));
                    }}
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <PlatformSelector
        accounts={connectedAccounts}
        accountIdsByPlatform={accountIdsByPlatform}
        disabled={isSubmitting}
        selected={platforms}
        onAccountChange={setAccountIdsByPlatform}
        onChange={setPlatforms}
      />

      <div className="grid gap-4 rounded-md border border-white/10 bg-black/25 p-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-white" htmlFor="scheduledAt">
          Schedule time
          <input
            className="studio-input h-10 px-3 text-sm font-normal disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            id="scheduledAt"
            required
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-white" htmlFor="timezone">
          Timezone
          <input
            className="studio-input h-10 px-3 text-sm font-normal disabled:cursor-not-allowed disabled:opacity-60"
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
              ? "flex items-start gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
              : "flex items-start gap-2 rounded-md border border-red-300/40 bg-red-400/10 px-4 py-3 text-sm text-red-100"
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
        className="studio-button-primary w-fit disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSubmit || isSubmitting}
        type="submit"
        title={!canSubmit ? scheduleBlockedCopy : undefined}
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        {isSubmitting ? "Scheduling..." : "Schedule post"}
      </button>
      {!canSubmit && scheduleBlockedCopy ? (
        <p className="-mt-4 text-sm text-slate-400" role="status">
          {scheduleBlockedCopy}
        </p>
      ) : null}
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

function getInitialAccountSelections(accounts: ComposerConnectedAccount[]) {
  const selections: Partial<Record<ComposerPlatform, string[]>> = {};

  for (const account of accounts) {
    if (!selections[account.platform]?.length) {
      selections[account.platform] = [account.id];
    }
  }

  return selections;
}

function getSubmitBlockedReason({
  video,
  hasRequiredMetadata,
  baseCaption,
  scheduledAt,
  timezone,
  platforms,
}: {
  video: UploadedVideo | null;
  hasRequiredMetadata: boolean;
  baseCaption: string;
  scheduledAt: string;
  timezone: string;
  platforms: ComposerPlatform[];
}) {
  if (!video) {
    return "Upload a video before scheduling.";
  }

  if (!hasRequiredMetadata) {
    return "Upload a video with readable width, height, and duration.";
  }

  if (!baseCaption.trim()) {
    return "Add a caption before scheduling.";
  }

  if (!platforms.length) {
    return "Select at least one platform.";
  }

  if (!scheduledAt) {
    return "Choose a schedule time.";
  }

  const scheduleDate = new Date(scheduledAt);

  if (Number.isNaN(scheduleDate.getTime())) {
    return "Schedule time must be a valid date and time.";
  }

  if (scheduleDate <= new Date()) {
    return "Choose a schedule time in the future.";
  }

  if (!timezone) {
    return "Choose a timezone.";
  }

  return "";
}
