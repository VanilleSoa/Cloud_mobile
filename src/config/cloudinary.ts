/**
 * Configuration Cloudinary
 * 
 * IMPORTANT: Remplacez ces valeurs par vos propres credentials Cloudinary
 * Obtenez-les sur: https://console.cloudinary.com/
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'dvrntsfel', // ✅ Votre cloud name Cloudinary (corrigé)
  uploadPreset: 'signalements', // Créez un upload preset dans Cloudinary (mode Unsigned)
};

/**
 * URL de l'API d'upload Cloudinary
 */
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

/**
 * Paramètres d'upload par défaut
 */
export const UPLOAD_OPTIONS = {
  folder: 'signalements', // Dossier dans Cloudinary
  resource_type: 'image',
  transformation: [
    {
      width: 1200,
      height: 1200,
      crop: 'limit',
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
};
