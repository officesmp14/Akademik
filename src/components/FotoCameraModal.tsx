"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, X } from "lucide-react";

/** Modal ambil foto langsung dari kamera (webcam bawaan, kamera USB
 *  eksternal, atau HP yang disambungkan sebagai webcam) lewat
 *  getUserMedia. Hasil jepretan diteruskan sebagai File biasa supaya bisa
 *  masuk ke alur crop yang sama seperti upload file. */
export default function FotoCameraModal({
  onCancel,
  onCapture,
}: {
  onCancel: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [capturing, setCapturing] = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startStream(preferredDeviceId?: string) {
    setStarting(true);
    setError(null);
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: preferredDeviceId ? { deviceId: { exact: preferredDeviceId } } : { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Label kamera cuma terisi setelah izin diberikan, jadi enumerasi
      // ulang di sini supaya dropdown pilihan kamera terisi nama aslinya.
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);

      const activeTrack = stream.getVideoTracks()[0];
      const activeId = activeTrack?.getSettings().deviceId;
      if (activeId) setDeviceId(activeId);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Tidak bisa mengakses kamera: ${err.message}`
          : "Tidak bisa mengakses kamera."
      );
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    async function init() {
      await startStream();
    }
    init();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDeviceChange(nextDeviceId: string) {
    setDeviceId(nextDeviceId);
    startStream(nextDeviceId);
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      setError("Gagal mengambil gambar (canvas tidak didukung).");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) {
          setError("Gagal mengambil gambar.");
          return;
        }
        stopStream();
        onCapture(new File([blob], "kamera.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  }

  function handleCancel() {
    stopStream();
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ambil Foto dari Kamera</p>
          <button
            type="button"
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative h-72 bg-slate-900 flex items-center justify-center">
          {starting && <Loader2 className="h-6 w-6 animate-spin text-white" />}
          {error && !starting && (
            <p className="text-sm text-red-400 text-center px-6">{error}</p>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${starting || error ? "hidden" : ""}`}
          />
        </div>

        <div className="px-4 py-3 space-y-3">
          {devices.length > 1 && (
            <select
              value={deviceId}
              onChange={(e) => handleDeviceChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Kamera ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          {error && (
            <button
              type="button"
              onClick={() => startStream(deviceId || undefined)}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Coba lagi
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={starting || capturing || !!error}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
          >
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Jepret
          </button>
        </div>
      </div>
    </div>
  );
}
