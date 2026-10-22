// Client-side prep for a player-chosen profile photo: center-crop to a
// square and downscale before upload. Re-encoding through a canvas also
// drops the original file's EXIF metadata (GPS location, device info),
// which phone camera photos carry by default.
export const PROFILE_PHOTO_SIZE = 512;
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

export class ProfilePhotoError extends Error {}

export function centerSquareCrop(width, height) {
  const side = Math.min(width, height);
  return { sx: (width - side) / 2, sy: (height - side) / 2, side };
}

export async function prepareProfilePhoto(file) {
  if (!file.type.startsWith("image/")) throw new ProfilePhotoError("Please choose a photo.");
  if (file.size > MAX_SOURCE_BYTES) throw new ProfilePhotoError("That photo is too large. Please pick another.");

  let bitmap;
  try {
    // "from-image" applies the EXIF rotation, so sideways phone photos come
    // out upright even though the EXIF itself is discarded below.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (e) {
    throw new ProfilePhotoError("Couldn't read that photo. Please try a different one.");
  }

  const { sx, sy, side } = centerSquareCrop(bitmap.width, bitmap.height);
  const outSize = Math.min(PROFILE_PHOTO_SIZE, side);
  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outSize, outSize);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new ProfilePhotoError("Couldn't process that photo. Please try a different one.");
  return blob;
}
