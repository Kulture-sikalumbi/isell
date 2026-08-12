"use client";

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.78;
const MAX_INPUT_FILE_BYTES = 12 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Compression failed"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

export async function uploadCompressedOrderSuccessImage(input: {
  paymentId: string;
  file: File;
}) {
  if (!ALLOWED_IMAGE_TYPES.has(input.file.type)) {
    throw new Error("Use JPG, PNG, or WebP images only");
  }

  if (input.file.size > MAX_INPUT_FILE_BYTES) {
    throw new Error("Image is too large. Please upload a file under 12MB");
  }

  const compressed = await compressImage(input.file);
  if (compressed.size > 2 * 1024 * 1024) {
    throw new Error("Compressed image is still too large. Try a smaller image");
  }

  const arrayBuffer = await compressed.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return {
    fileName: `${input.paymentId}.jpg`,
    contentType: "image/jpeg",
    base64Data: btoa(binary),
  };
}
