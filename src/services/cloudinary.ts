import { CLOUDINARY_CONFIG, CLOUDINARY_UPLOAD_URL } from '@/config/cloudinary';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

/**
 * Uploader une image vers Cloudinary
 * @param base64Image Image en base64 (avec ou sans le préfixe data:image)
 * @param filename Nom du fichier (optionnel)
 */
export const uploadToCloudinary = async (
  base64Image: string,
  filename?: string
): Promise<CloudinaryUploadResponse> => {
  try {
    // Créer le FormData pour l'upload (minimum requis pour unsigned)
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    console.log('[Cloudinary] Upload en cours vers:', CLOUDINARY_UPLOAD_URL);

    // Envoyer la requête à Cloudinary
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cloudinary] Erreur serveur:', errorText);
      throw new Error(`Erreur Cloudinary: ${response.status} - ${errorText}`);
    }

    const data: CloudinaryUploadResponse = await response.json();
    
    console.log('[Cloudinary] Upload réussi:', data.secure_url);
    
    return data;
  } catch (error) {
    console.error('[Cloudinary] Erreur upload:', error);
    throw new Error(`Impossible d'uploader l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
};

/**
 * Uploader plusieurs images vers Cloudinary
 * @param base64Images Tableau d'images en base64
 */
export const uploadMultipleToCloudinary = async (
  base64Images: string[]
): Promise<CloudinaryUploadResponse[]> => {
  try {
    console.log(`[Cloudinary] Upload de ${base64Images.length} image(s)...`);
    
    // Upload toutes les images en parallèle
    const uploadPromises = base64Images.map((image, index) => 
      uploadToCloudinary(image, `signalement_${Date.now()}_${index}`)
    );

    const results = await Promise.all(uploadPromises);
    
    console.log(`[Cloudinary] ${results.length} image(s) uploadée(s) avec succès`);
    
    return results;
  } catch (error) {
    console.error('[Cloudinary] Erreur upload multiple:', error);
    throw error;
  }
};

/**
 * Supprimer une image de Cloudinary
 * @param publicId ID public de l'image dans Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  // Note: La suppression nécessite une clé API secrète
  // Elle doit être faite côté backend pour des raisons de sécurité
  console.warn('[Cloudinary] La suppression doit être faite côté backend');
  // TODO: Implémenter l'appel API backend pour supprimer
};
