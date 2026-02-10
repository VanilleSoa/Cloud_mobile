import { ref } from 'vue';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { uploadToCloudinary } from '@/services/cloudinary';

export interface SignalementPhoto {
  id: string;
  webPath: string;
  cloudinaryUrl: string; // URL Cloudinary au lieu du base64
  compressed?: boolean;
}

export const useSignalementPhotos = () => {
  const photos = ref<SignalementPhoto[]>([]);
  const isProcessing = ref(false);

  /**
   * Compresser et redimensionner une image
   * @param base64 Image en base64
   * @param maxWidth Largeur maximale (par défaut 1200px)
   * @param maxHeight Hauteur maximale (par défaut 1200px)
   * @param quality Qualité de compression (0-1, par défaut 0.8)
   */
  const compressImage = async (
    base64: string,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculer les nouvelles dimensions en gardant le ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Créer un canvas pour redimensionner
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'));
          return;
        }

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir en base64 avec compression
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('Erreur lors du chargement de l\'image'));
      };

      img.src = base64;
    });
  };

  /**
   * Sélectionner des photos depuis la galerie du téléphone
   */
  const selectPhotos = async () => {
    try {
      isProcessing.value = true;

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (image.dataUrl) {
        // Compresser l'image
        console.log('[Photo] Compression de l\'image...');
        const compressedBase64 = await compressImage(image.dataUrl);

        // Uploader vers Cloudinary
        console.log('[Photo] Upload vers Cloudinary...');
        const uploadResult = await uploadToCloudinary(compressedBase64, `signalement_${Date.now()}`);

        const photo: SignalementPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          webPath: uploadResult.secure_url, // Utiliser l'URL Cloudinary pour l'affichage
          cloudinaryUrl: uploadResult.secure_url,
          compressed: true,
        };

        photos.value.push(photo);
        console.log('[Photo] Photo ajoutée:', uploadResult.secure_url);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de photo:', error);
      throw error;
    } finally {
      isProcessing.value = false;
    }
  };

  /**
   * Prendre une photo avec la caméra
   */
  const takePhoto = async () => {
    try {
      isProcessing.value = true;

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        // Compresser l'image
        console.log('[Photo] Compression de l\'image...');
        const compressedBase64 = await compressImage(image.dataUrl);

        // Uploader vers Cloudinary
        console.log('[Photo] Upload vers Cloudinary...');
        const uploadResult = await uploadToCloudinary(compressedBase64, `signalement_${Date.now()}`);

        const photo: SignalementPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          webPath: uploadResult.secure_url, // Utiliser l'URL Cloudinary pour l'affichage
          cloudinaryUrl: uploadResult.secure_url,
          compressed: true,
        };

        photos.value.push(photo);
        console.log('[Photo] Photo ajoutée:', uploadResult.secure_url);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      throw error;
    } finally {
      isProcessing.value = false;
    }
  };

  /**
   * Supprimer une photo de la liste
   */
  const removePhoto = (photoId: string) => {
    photos.value = photos.value.filter(photo => photo.id !== photoId);
  };

  /**
   * Supprimer toutes les photos
   */
  const clearPhotos = () => {
    photos.value = [];
  };

  /**
   * Obtenir les URLs Cloudinary des photos pour l'envoi
   */
  const getPhotosUrls = (): string[] => {
    return photos.value.map(photo => photo.cloudinaryUrl);
  };

  return {
    photos,
    isProcessing,
    selectPhotos,
    takePhoto,
    removePhoto,
    clearPhotos,
    getPhotosUrls,
  };
};
