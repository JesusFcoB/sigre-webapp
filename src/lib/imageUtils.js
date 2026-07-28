/**
 * Comprime una imagen (File o Blob) y devuelve un base64 (DataURL) en formato WebP.
 * @param {File|Blob} file El archivo de imagen a comprimir.
 * @param {number} maxWidth El ancho máximo permitido.
 * @param {number} maxHeight El alto máximo permitido.
 * @param {number} quality La calidad de la imagen (0 a 1).
 * @returns {Promise<string>} Promesa que resuelve a un string base64.
 */
export function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantener el aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Exportar a webp para mejor compresión, o jpeg como fallback
        const dataUrl = canvas.toDataURL("image/webp", quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
