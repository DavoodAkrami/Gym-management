"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FiCopy, FiDownload, FiRefreshCw } from "react-icons/fi";
import { ListSkeleton } from "@/components/panel/PanelSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import { getTranslation } from "@/lib/i18n/translations";
import {
  ensureSignupLink,
  regenerateSignupLink,
  type SignupLinkInfo,
} from "@/lib/supabase/signup-link";
import { signupActions } from "@/lib/store/slices";
import { useAppDispatch } from "@/lib/store/hooks";
import type { Locale } from "@/lib/store/slices";

type SignupLinkPanelProps = {
  gymId: string;
  locale: Locale;
};

function downloadQrPng(svg: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare download.");
  }

  const img = new Image();
  const blobUrl = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }));

  return new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(blobUrl);

      const pngUrl = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = pngUrl;
      anchor.download = filename;
      anchor.click();
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error("Could not render QR code."));
    };
    img.src = blobUrl;
  });
}

export function SignupLinkPanel({ gymId, locale }: SignupLinkPanelProps) {
  const dispatch = useAppDispatch();
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(locale, key);
  const qrRef = useRef<SVGSVGElement>(null);

  const [link, setLink] = useState<SignupLinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const syncRedux = useCallback(
    (info: SignupLinkInfo) => {
      dispatch(
        signupActions.setSignupLink({
          gym_id: info.gym_id,
          token: info.token,
          url: info.url,
        }),
      );
    },
    [dispatch],
  );

  const loadLink = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const info = await ensureSignupLink(gymId);
      setLink(info);
      dispatch(
        signupActions.setSignupLink({
          gym_id: info.gym_id,
          token: info.token,
          url: info.url,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : getTranslation(locale, "authErrorGeneric"),
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, gymId, locale]);

  useEffect(() => {
    void loadLink();
  }, [loadLink]);

  const handleCopy = async () => {
    if (!link?.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("signupCopyFailed"));
    }
  };

  const handleDownloadQr = async () => {
    const svg = qrRef.current;
    if (!svg || !link?.url) {
      return;
    }

    setError(null);
    try {
      await downloadQrPng(svg, "gym-signup-qr.png");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("signupQrDownloadFailed"));
    }
  };

  const handleRegenerate = async () => {
    setBusy(true);
    setError(null);

    try {
      const info = await regenerateSignupLink(gymId);
      setLink(info);
      syncRedux(info);
      setCopied(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : getTranslation(locale, "authErrorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <ListSkeleton rows={3} />;
  }

  return (
    <div className="panel-section-root space-y-4">
      <p className="text-sm font-medium leading-7 text-muted-foreground">{t("signupPanelDesc")}</p>

      {error ? (
        <p className="panel-alert border border-danger/30 bg-danger/10 text-danger">{error}</p>
      ) : null}

      <div className="panel-card grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0 space-y-2">
          <span className="text-eyebrow">{t("signupPanelLinkLabel")}</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              readOnly
              value={link?.url ?? ""}
              className="w-full min-w-0 flex-1 px-3 py-2 font-mono text-xs sm:text-sm"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 px-3 py-2 text-xs font-black sm:text-sm"
            >
              <FiCopy aria-hidden="true" />
              {copied ? t("signupCopied") : t("signupCopy")}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 sm:flex-row lg:flex-col">
          {link?.url ? (
            <div className="qr-frame grid place-items-center bg-white p-2">
              <QRCodeSVG ref={qrRef} value={link.url} size={128} level="M" includeMargin={false} />
            </div>
          ) : null}
          <button
            type="button"
            disabled={!link?.url}
            onClick={() => void handleDownloadQr()}
            className="btn-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-black disabled:opacity-60 sm:text-sm"
          >
            <FiDownload aria-hidden="true" />
            {t("signupDownloadQr")}
          </button>
        </div>
      </div>

      <p className="text-xs font-semibold text-muted-foreground">{t("signupPanelQrHint")}</p>

      <button
        type="button"
        disabled={busy}
        onClick={() => void handleRegenerate()}
        className="inline-flex items-center gap-2 border border-glass-border bg-glass px-4 py-2.5 text-sm font-bold text-foreground"
      >
        {busy ? (
          <Spinner label={t("uiLoading")} />
        ) : (
          <>
            <FiRefreshCw aria-hidden="true" />
            {t("signupRegenerate")}
          </>
        )}
      </button>
    </div>
  );
}
