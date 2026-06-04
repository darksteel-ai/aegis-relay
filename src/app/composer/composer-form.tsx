"use client";

import { AlertCircle, Calendar, CalendarPlus, CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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

type ComposerMediaItem = {
  id: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  createdAt: number;
};

type TikTokCreatorInfo = {
  accountName: string;
  externalId: string;
  privacyLevelOptions: string[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maxVideoPostDurationSec: number | null;
};

export function ComposerForm({
  connectedAccounts = [],
  initialMediaId,
  mediaLibrary = [],
}: {
  connectedAccounts?: ComposerConnectedAccount[];
  initialMediaId?: string;
  mediaLibrary?: ComposerMediaItem[];
}) {
  const [video, setVideo] = useState<UploadedVideo | null>(() =>
    initialMediaId ? mediaItemToUploadedVideo(mediaLibrary.find((item) => item.id === initialMediaId)) : null,
  );
  const [platforms, setPlatforms] = useState<ComposerPlatform[]>(["YOUTUBE"]);
  const [accountIdsByPlatform, setAccountIdsByPlatform] = useState<
    Partial<Record<ComposerPlatform, string[]>>
  >(() => getInitialAccountSelections(connectedAccounts));
  const [baseCaption, setBaseCaption] = useState("");
  const [platformCaptions, setPlatformCaptions] = useState<Partial<Record<ComposerPlatform, string>>>({});
  const [youtubeTitle, setYoutubeTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [tiktokTitle, setTikTokTitle] = useState("");
  const [tiktokPrivacyLevel, setTikTokPrivacyLevel] = useState("");
  const [tiktokAllowComments, setTikTokAllowComments] = useState(false);
  const [tiktokAllowDuet, setTikTokAllowDuet] = useState(false);
  const [tiktokAllowStitch, setTikTokAllowStitch] = useState(false);
  const [tiktokBrandContent, setTikTokBrandContent] = useState(false);
  const [tiktokBrandOrganic, setTikTokBrandOrganic] = useState(false);
  const [tiktokMusicUsageConfirmed, setTikTokMusicUsageConfirmed] = useState(false);
  const [tiktokCreatorInfo, setTikTokCreatorInfo] = useState<TikTokCreatorInfo | null>(null);
  const [tiktokCreatorInfoState, setTikTokCreatorInfoState] = useState<SubmitState>({
    type: "idle",
  });
  const [scheduledAt, setScheduledAt] = useState("");
  const scheduleInputRef = useRef<HTMLInputElement>(null);
  const [workflowStatus, setWorkflowStatus] = useState<"DRAFT" | "NEEDS_REVIEW" | "APPROVED">(
    "APPROVED",
  );
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
  const selectedTikTokAccountId = accountIdsByPlatform.TIKTOK?.[0] ?? "";
  const selectedTikTokAccount = useMemo(
    () => connectedAccounts.find((account) => account.id === selectedTikTokAccountId),
    [connectedAccounts, selectedTikTokAccountId],
  );
  const isTikTokSelected = platforms.includes("TIKTOK");
  const visibleTikTokCreatorInfo =
    isTikTokSelected && tiktokCreatorInfo?.externalId === selectedTikTokAccount?.externalId
      ? tiktokCreatorInfo
      : null;
  const hasRequiredMetadata = Boolean(video?.width && video.height && video.durationSeconds);
  const submitBlockedReason = getSubmitBlockedReason({
    video,
    hasRequiredMetadata,
    baseCaption,
    scheduledAt,
    timezone,
    platforms,
    tiktokPrivacyLevel,
    tiktokMusicUsageConfirmed,
  });
  const canSubmit = !submitBlockedReason;
  const scheduleBlockedCopy =
    submitState.type === "success" ? "Ready for the next post." : submitBlockedReason;

  useEffect(() => {
    if (!isTikTokSelected || !selectedTikTokAccountId) {
      return;
    }

    let isCurrent = true;

    fetch(`/api/tiktok/creator-info?accountId=${encodeURIComponent(selectedTikTokAccountId)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }
        return response.json() as Promise<TikTokCreatorInfo>;
      })
      .then((body) => {
        if (!isCurrent) {
          return;
        }
        setTikTokCreatorInfo(body);
        setTikTokCreatorInfoState({
          type: "success",
          message: `Latest TikTok creator settings loaded for ${body.accountName}.`,
        });
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }
        setTikTokCreatorInfo(null);
        setTikTokCreatorInfoState({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "TikTok creator settings could not be loaded.",
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [isTikTokSelected, selectedTikTokAccountId]);

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
          platformCaptions,
          workflowStatus,
          tiktokSettings: isTikTokSelected
            ? {
                title: tiktokTitle || baseCaption,
                privacyLevel: tiktokPrivacyLevel,
                allowComments: tiktokAllowComments,
                allowDuet: tiktokAllowDuet,
                allowStitch: tiktokAllowStitch,
                brandContent: tiktokBrandContent,
                brandOrganic: tiktokBrandOrganic,
                musicUsageConfirmed: tiktokMusicUsageConfirmed,
              }
            : undefined,
          video: {
            existingVideoId: video.id,
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
        message:
          "Post scheduled. Selected connected accounts will publish automatically when the scheduled time arrives.",
      });
      setBaseCaption("");
      setPlatformCaptions({});
      setYoutubeTitle("");
      setHashtags("");
      setTikTokTitle("");
      setTikTokPrivacyLevel("");
      setTikTokAllowComments(false);
      setTikTokAllowDuet(false);
      setTikTokAllowStitch(false);
      setTikTokBrandContent(false);
      setTikTokBrandOrganic(false);
      setTikTokMusicUsageConfirmed(false);
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

  function openSchedulePicker() {
    const input = scheduleInputRef.current;

    if (!input) {
      return;
    }

    input.focus();
    input.showPicker?.();
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

      {mediaLibrary.length > 0 ? (
        <div className="grid gap-3 rounded-md border border-white/10 bg-black/25 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Media library</p>
            <p className="mt-1 text-sm text-slate-400">
              Reuse a previous upload instead of uploading the same video again.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {mediaLibrary.slice(0, 4).map((item) => (
              <button
                className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-left text-sm transition-colors hover:border-cyan-300/30 hover:bg-cyan-300/[0.06]"
                disabled={isSubmitting}
                key={item.id}
                type="button"
                onClick={() => {
                  setVideo(mediaItemToUploadedVideo(item));
                  setSubmitState({ type: "idle" });
                }}
              >
                <span className="block truncate font-semibold text-white">{item.fileName}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {item.width && item.height ? `${item.width}x${item.height}` : "Video"}{" "}
                  {item.durationSec ? `- ${Math.round(item.durationSec)} sec` : ""}
                </span>
              </button>
            ))}
          </div>
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

      <div className="grid gap-4 rounded-md border border-white/10 bg-black/25 p-4">
        <div>
          <p className="text-sm font-semibold text-white">Platform-specific captions</p>
          <p className="mt-1 text-sm text-slate-400">
            Leave a field blank to use the base caption for that platform.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {platforms.map((platform) => (
            <label className="grid gap-2 text-sm font-medium text-white" key={platform}>
              {formatComposerPlatform(platform)} caption
              <textarea
                className="studio-input min-h-28 resize-y px-3 py-2 text-sm font-normal leading-6 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                maxLength={2200}
                value={platformCaptions[platform] ?? ""}
                onChange={(event) =>
                  setPlatformCaptions((current) => ({
                    ...current,
                    [platform]: event.target.value,
                  }))
                }
                placeholder="Use base caption"
              />
            </label>
          ))}
        </div>
      </div>

      {isTikTokSelected ? (
        <section className="grid gap-4 rounded-md border border-cyan-300/25 bg-cyan-300/[0.045] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">TikTok posting settings</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Confirm creator, privacy, interaction, and rights settings before this video is
                sent to TikTok.
              </p>
            </div>
            <span className="w-fit rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              {selectedTikTokAccount?.accountName ?? "No TikTok account selected"}
            </span>
          </div>

          {tiktokCreatorInfoState.type !== "idle" ? (
            <div
              className={
                tiktokCreatorInfoState.type === "success"
                  ? "flex items-start gap-2 rounded-md border border-emerald-300/35 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
                  : "flex items-start gap-2 rounded-md border border-red-300/40 bg-red-400/10 px-4 py-3 text-sm text-red-100"
              }
              role="status"
            >
              {tiktokCreatorInfoState.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <p>{tiktokCreatorInfoState.message}</p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="grid gap-3 rounded-md border border-white/10 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Preview</p>
              <div className="grid aspect-[9/16] max-h-80 place-items-center rounded-md border border-white/10 bg-black/35 px-4 text-center">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {video?.fileName ?? "Upload a vertical video"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {video?.width && video.height && video.durationSeconds
                      ? `${video.width}x${video.height} - ${Math.round(video.durationSeconds)} seconds`
                      : "TikTok preview appears after upload metadata is read."}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                TikTok reviews uploaded videos and may reject, mute, or remove content that
                violates its posting or music rules.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="tiktokTitle">
                TikTok title
                <textarea
                  className="studio-input min-h-24 resize-y px-3 py-2 text-sm font-normal leading-6 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  id="tiktokTitle"
                  maxLength={2200}
                  value={tiktokTitle}
                  onChange={(event) => setTikTokTitle(event.target.value)}
                  placeholder="Defaults to the caption if left blank."
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-white" htmlFor="tiktokPrivacy">
                TikTok privacy
                <select
                  className="studio-input h-10 px-3 text-sm font-normal disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  id="tiktokPrivacy"
                  required
                  value={tiktokPrivacyLevel}
                  onChange={(event) => setTikTokPrivacyLevel(event.target.value)}
                >
                  <option value="">Choose privacy before posting</option>
                  {getTikTokPrivacyOptions(visibleTikTokCreatorInfo).map((option) => (
                    <option key={option} value={option}>
                      {formatTikTokPrivacy(option)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3">
                <p className="text-sm font-medium text-white">Interactions</p>
                <TikTokCheckbox
                  checked={tiktokAllowComments}
                  disabled={isSubmitting || visibleTikTokCreatorInfo?.commentDisabled === true}
                  label="Allow comments"
                  onChange={setTikTokAllowComments}
                />
                <TikTokCheckbox
                  checked={tiktokAllowDuet}
                  disabled={isSubmitting || visibleTikTokCreatorInfo?.duetDisabled === true}
                  label="Allow Duet"
                  onChange={setTikTokAllowDuet}
                />
                <TikTokCheckbox
                  checked={tiktokAllowStitch}
                  disabled={isSubmitting || visibleTikTokCreatorInfo?.stitchDisabled === true}
                  label="Allow Stitch"
                  onChange={setTikTokAllowStitch}
                />
              </div>

              <div className="grid gap-3 border-t border-white/10 pt-4">
                <p className="text-sm font-medium text-white">Commercial content disclosure</p>
                <TikTokCheckbox
                  checked={tiktokBrandOrganic}
                  disabled={isSubmitting}
                  label="This video promotes my own brand, product, or service"
                  onChange={setTikTokBrandOrganic}
                />
                <TikTokCheckbox
                  checked={tiktokBrandContent}
                  disabled={isSubmitting}
                  label="This video includes paid partnership or third-party brand content"
                  onChange={setTikTokBrandContent}
                />
              </div>

              <div className="rounded-md border border-white/10 bg-black/25 p-3">
                <TikTokCheckbox
                  checked={tiktokMusicUsageConfirmed}
                  disabled={isSubmitting}
                  label="I confirm this video uses music, sounds, and creative assets that I own or have permission to use on TikTok"
                  onChange={setTikTokMusicUsageConfirmed}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 rounded-md border border-white/10 bg-black/25 p-4 sm:grid-cols-2">
        <div className="grid gap-2 text-sm font-medium text-white">
          <label htmlFor="scheduledAt">Schedule time</label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="studio-input h-10 w-full px-3 text-sm font-normal disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              id="scheduledAt"
              ref={scheduleInputRef}
              required
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-200/60 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              type="button"
              onClick={openSchedulePicker}
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>Pick date</span>
            </button>
          </div>
        </div>

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

      <fieldset className="grid gap-3 rounded-md border border-white/10 bg-black/25 p-4">
        <legend className="text-sm font-semibold text-white">Approval workflow</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["APPROVED", "Schedule now", "Ready for automatic publishing."],
            ["NEEDS_REVIEW", "Needs review", "Save for approval before publishing."],
            ["DRAFT", "Draft", "Save as an unfinished draft."],
          ].map(([value, label, description]) => (
            <label
              className={
                workflowStatus === value
                  ? "rounded-md border border-cyan-300/45 bg-cyan-300/10 p-3"
                  : "rounded-md border border-white/10 bg-white/[0.035] p-3"
              }
              key={value}
            >
              <input
                checked={workflowStatus === value}
                className="mr-2 accent-cyan-300"
                name="workflowStatus"
                type="radio"
                value={value}
                onChange={() => setWorkflowStatus(value as typeof workflowStatus)}
              />
              <span className="text-sm font-semibold text-white">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
        {isSubmitting
          ? "Saving..."
          : workflowStatus === "APPROVED"
            ? "Schedule post"
            : "Save post"}
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

function mediaItemToUploadedVideo(item: ComposerMediaItem | undefined) {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    key: item.storageKey,
    fileName: item.fileName,
    contentType: item.mimeType as UploadedVideo["contentType"],
    sizeBytes: item.sizeBytes,
    width: item.width ?? undefined,
    height: item.height ?? undefined,
    durationSeconds: item.durationSec ?? undefined,
  };
}

function TikTokCheckbox({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
      <input
        className="mt-1 h-4 w-4 accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function getTikTokPrivacyOptions(creatorInfo: TikTokCreatorInfo | null) {
  const options = creatorInfo?.privacyLevelOptions?.filter(Boolean);

  if (options?.length) {
    return options;
  }

  return [
    "SELF_ONLY",
    "MUTUAL_FOLLOW_FRIENDS",
    "FOLLOWER_OF_CREATOR",
    "PUBLIC_TO_EVERYONE",
  ];
}

function formatTikTokPrivacy(option: string) {
  const labels: Record<string, string> = {
    SELF_ONLY: "Only me",
    MUTUAL_FOLLOW_FRIENDS: "Friends",
    FOLLOWER_OF_CREATOR: "Followers",
    PUBLIC_TO_EVERYONE: "Everyone",
  };

  return labels[option] ?? option;
}

function formatComposerPlatform(platform: ComposerPlatform) {
  const labels: Record<ComposerPlatform, string> = {
    YOUTUBE: "YouTube Shorts",
    TIKTOK: "TikTok",
    INSTAGRAM: "Instagram Reels",
  };

  return labels[platform];
}

function getSubmitBlockedReason({
  video,
  hasRequiredMetadata,
  baseCaption,
  scheduledAt,
  timezone,
  platforms,
  tiktokPrivacyLevel,
  tiktokMusicUsageConfirmed,
}: {
  video: UploadedVideo | null;
  hasRequiredMetadata: boolean;
  baseCaption: string;
  scheduledAt: string;
  timezone: string;
  platforms: ComposerPlatform[];
  tiktokPrivacyLevel: string;
  tiktokMusicUsageConfirmed: boolean;
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

  if (platforms.includes("TIKTOK") && !tiktokPrivacyLevel) {
    return "Choose TikTok privacy before scheduling.";
  }

  if (platforms.includes("TIKTOK") && !tiktokMusicUsageConfirmed) {
    return "Confirm TikTok music usage rights before scheduling.";
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
