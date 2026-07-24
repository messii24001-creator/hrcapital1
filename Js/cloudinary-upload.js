// Uploads images to Cloudinary directly from the browser — free,
// no backend needed. Also compresses/resizes the image client-side
// before uploading, so a customer's multi-MB gallery photo becomes
// a small file automatically (keeps free-tier usage low and makes
// uploads faster).

const CLOUD_NAME = "xavv5ylg";
const UPLOAD_PRESET = "hrcapital";

// Resize an image file down to maxDimension on its longest side and
// re-encode it as JPEG at the given quality, all in-browser via
// Canvas. Returns a Blob ready to upload.
function compressImage(file, maxDimension = 800, quality = 0.8) {

  return new Promise((resolve, reject) => {

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {

      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Image compression failed"));
        },
        "image/jpeg",
        quality
      );

    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file"));
    };

    img.src = objectUrl;

  });

}

// Compresses the given file, uploads it to Cloudinary, and returns
// the hosted image URL (string). Throws on failure — callers should
// wrap this in try/catch.
export async function uploadImageToCloudinary(file) {

  const compressed = await compressImage(file);

  const formData = new FormData();
  formData.append("file", compressed);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    throw new Error("Cloudinary upload failed (" + response.status + ")");
  }

  const data = await response.json();
  return data.secure_url;

}
