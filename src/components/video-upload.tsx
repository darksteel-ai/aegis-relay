"use client";

import { Upload, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import {
  isSupportedShortFormVideoType,
  validateShortFormVideo,
  type SupportedShortFormVideoType,
} from "@/lib/validation/video";

type PresignResponse = {
  key: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
};

export type UploadedVideo = {
  key: string;
  fileName: string;
  contentType: SupportedShortFormVideoType;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

type VideoMetadata = {
  width?: number;
  height?: number;
  durationSeconds?: number;
};

type VideoUploadProps = {
  endpoint?: string;
  disabled?: boolean;
  onUploaded?: (video: UploadedVideo) => void;
  onUploadStart?: (file: File) => void;
  onError?: (message: string) => void;
};

export function VideoUpload({
  endpoint = "/api/uploads/presign",
  disabled = false,
  onUploaded,
  onUploadStart,
  onError,
}: VideoUploadProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata>({});
  const [status, setStatus] = useState<"idle" | "reading" | "ready" | "uploading" | "uploaded">(
    "idle",
  );
  const [message, setMessage] = useState("Choose a vertical MP4 or MOV up to 500MB.");

  const reportError = useCallback(
    (nextMessage: string) => {
      setMessage(nextMessage);
      onError?.(nextMessage);
    },
    [onError],
  );

  const updateValidationState = useCallback(
    (nextFile: File, nextMetadata: VideoMetadata) => {
      const validationError = getSelectedFileValidationError(nextFile, nextMetadata);

      if (validationError) {
        reportError(validationError);
        return;
      }

      setStatus("ready");
      setMessage("Ready to upload.");
    },
    [reportError],
  );

  useEffect(() => {
    if (!file) {
      return;
    }

    let revoked = false;
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (revoked) {
        return;
      }

      const nextMetadata = {
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
        durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
      };

      setMetadata(nextMetadata);
      updateValidationState(file, nextMetadata);
      URL.revokeObjectURL(objectUrl);
      revoked = true;
    };
    video.onerror = () => {
      if (revoked) {
        return;
      }

      setMetadata({});
      updateValidationState(file, {});
      URL.revokeObjectURL(objectUrl);
      revoked = true;
    };
    video.src = objectUrl;

    return () => {
      if (!revoked) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file, updateValidationState]);

  async function uploadSelectedFile() {
    if (!file || disabled || status === "uploading") {
      return;
    }

    const contentType = file.type;

    if (!isSupportedShortFormVideoType(contentType)) {
      reportError("Upload an MP4 or MOV video.");
      return;
    }

    const validationError = getSelectedFileValidationError(file, metadata);

    if (validationError) {
      reportError(validationError);
      return;
    }

    setStatus("uploading");
    setMessage("Preparing upload...");
    onUploadStart?.(file);

    try {
      const presignResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType,
          sizeBytes: file.size,
        }),
      });

      if (!presignResponse.ok) {
        const error = await readErrorMessage(presignResponse);
        throw new Error(error);
      }

      const presign = (await presignResponse.json()) as PresignResponse;
      setMessage("Uploading video...");

      const uploadResponse = await fetch(presign.uploadUrl, {
        method: presign.method,
        headers: presign.headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed. Please try again.");
      }

      setStatus("uploaded");
      setMessage("Video uploaded.");
      onUploaded?.({
        key: presign.key,
        fileName: file.name,
        contentType,
        sizeBytes: file.size,
        ...metadata,
      });
    } catch (error) {
      reportError(toUploadErrorMessage(error));
      setStatus("ready");
    }
  }

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setMetadata({});

    if (!nextFile) {
      setStatus("idle");
      setMessage("Choose a vertical MP4 or MOV up to 500MB.");
      return;
    }

    setStatus("reading");
    setMessage("Reading video details...");
  }

  const canUpload = file && status === "ready" && !disabled;

  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-black/25 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="text-sm font-medium text-white" htmlFor={inputId}>
            Video file
          </label>
          <p className="mt-1 text-sm text-slate-400" role="status">
            {message}
          </p>
        </div>
        {file ? (
          <button
            className="studio-button-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || status === "uploading"}
            type="button"
            onClick={() => selectFile(null)}
          >
            <X aria-hidden="true" size={16} />
            Remove
          </button>
        ) : null}
      </div>

      <input
        accept="video/mp4,video/quicktime,.mp4,.mov"
        className="studio-input block w-full px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-100 hover:file:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled || status === "uploading"}
        id={inputId}
        type="file"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      {file ? (
        <dl className="grid gap-2 rounded-md border border-white/10 bg-white/[0.035] p-3 text-sm text-slate-400 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-white">Selected</dt>
            <dd className="mt-1 break-all">{file.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-white">Size</dt>
            <dd className="mt-1">{formatBytes(file.size)}</dd>
          </div>
          {metadata.width && metadata.height ? (
            <div>
              <dt className="font-medium text-white">Format</dt>
              <dd className="mt-1">
                {metadata.width} x {metadata.height}
              </dd>
            </div>
          ) : null}
          {metadata.durationSeconds ? (
            <div>
              <dt className="font-medium text-white">Duration</dt>
              <dd className="mt-1">{Math.round(metadata.durationSeconds)} seconds</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <button
        className="studio-button-secondary w-fit disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canUpload}
        type="button"
        onClick={uploadSelectedFile}
      >
        <Upload aria-hidden="true" size={16} />
        {status === "uploading" ? "Uploading..." : "Upload video"}
      </button>
    </div>
  );
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Upload could not be prepared.";
  } catch {
    return "Upload could not be prepared.";
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function toUploadErrorMessage(error: unknown) {
  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return "Upload could not reach storage. Check the bucket CORS settings and try again.";
  }

  return error instanceof Error ? error.message : "Upload failed. Please try again.";
}

function getSelectedFileValidationError(file: File, metadata: VideoMetadata) {
  const contentType = file.type;

  if (!isSupportedShortFormVideoType(contentType)) {
    return "Upload an MP4 or MOV video.";
  }

  const validation = validateShortFormVideo({
    contentType,
    sizeBytes: file.size,
    width: metadata.width,
    height: metadata.height,
    durationSeconds: metadata.durationSeconds,
  });

  if (!validation.ok) {
    return validation.errors[0];
  }

  if (!metadata.width || !metadata.height || !metadata.durationSeconds) {
    return "Could not read video dimensions and duration.";
  }

  return null;
}
