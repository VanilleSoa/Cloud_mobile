# Configuration Cloudinary

Ce guide explique comment configurer Cloudinary pour stocker les images des signalements.

## 📋 Prérequis

- Un compte Cloudinary (gratuit sur [cloudinary.com](https://cloudinary.com))
- Les packages `@cloudinary/url-gen` et `@cloudinary/vue` déjà installés

## 🔧 Étape 1: Créer un compte Cloudinary

1. Allez sur [cloudinary.com](https://cloudinary.com) et créez un compte gratuit
2. Une fois connecté, allez dans votre **Dashboard**
3. Notez votre **Cloud Name** (affiché en haut)

## 🎯 Étape 2: Créer un Upload Preset

1. Dans votre dashboard Cloudinary, allez dans **Settings** ⚙️
2. Cliquez sur l'onglet **Upload**
3. Scrollez jusqu'à **Upload presets**
4. Cliquez sur **Add upload preset**
5. Configurez le preset:
   - **Preset name**: `signalements`
   - **Signing mode**: ✅ **Unsigned** (important!)
   - **Folder**: `signalements`
   - **Access mode**: Upload
   - **Unique filename**: ✅ activé
   - **Use filename**: ✅ activé
   - **Overwrite**: non activé
6. **Sauvegardez** le preset

## 🔐 Étape 3: Configurer l'application

Ouvrez le fichier `src/config/cloudinary.ts` et remplacez les valeurs:

```typescript
export const CLOUDINARY_CONFIG = {
  cloudName: 'VOTRE_CLOUD_NAME', // ⚠️ Remplacez par votre Cloud Name
  uploadPreset: 'signalements',    // Le nom du preset créé à l'étape 2
};
```

### Exemple:
Si votre Cloud Name est `demo-app-123`, le fichier devrait ressembler à:

```typescript
export const CLOUDINARY_CONFIG = {
  cloudName: 'demo-app-123',
  uploadPreset: 'signalements',
};
```

## ✅ Étape 4: Vérifier la configuration

1. Lancez l'application: `npm run dev`
2. Allez sur le formulaire de signalement
3. Ajoutez une photo (galerie ou caméra)
4. **Vérifiez la console** du navigateur:
   - Vous devriez voir: `[Cloudinary] Upload en cours...`
   - Puis: `[Cloudinary] Upload réussi: https://res.cloudinary.com/...`
5. Allez dans votre **Media Library** Cloudinary:
   - La photo devrait apparaître dans le dossier `signalements`

## 📦 Structure des fichiers uploadés

Les images sont stockées avec:
- **Dossier**: `signalements/`
- **Nom**: `signalement_TIMESTAMP_INDEX` (ex: `signalement_1707562800000_0`)
- **Format**: Auto-optimisé par Cloudinary (WebP si supporté)
- **Dimensions**: Maximum 1200x1200px (compression côté client avant upload)
- **Qualité**: Auto-optimisée par Cloudinary

## 🔒 Sécurité

### Unsigned Upload (Mode actuel)
- ✅ **Avantage**: Pas besoin de backend pour uploader
- ⚠️ **Limitation**: Peut être abusé (limite de quota)
- 💡 **Recommandé pour**: Développement et petites applications

### Signed Upload (Pour production)
Pour plus de sécurité en production:

1. **Créez une route backend** pour signer les uploads:
```typescript
// backend/src/routes/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

router.post('/sign-upload', async (req, res) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request({
    timestamp,
    folder: 'signalements',
  }, process.env.CLOUDINARY_API_SECRET);
  
  res.json({ signature, timestamp });
});
```

2. **Modifiez le service frontend** pour utiliser la signature

## 🎨 Transformations Cloudinary

Cloudinary applique automatiquement:
- **Format optimal**: WebP pour les navigateurs compatibles
- **Compression**: `quality: auto:good`
- **Responsive**: Les images s'adaptent à l'écran

## 📊 Quota gratuit

Le plan gratuit Cloudinary offre:
- ✅ **25 crédits/mois** (≈ 25 000 images)
- ✅ **25 GB de stockage**
- ✅ **25 GB de bande passante**

Largement suffisant pour débuter!

## 🆘 Dépannage

### Erreur: "Invalid cloud name"
➡️ Vérifiez que vous avez bien remplacé `VOTRE_CLOUD_NAME` dans `cloudinary.ts`

### Erreur: "Upload preset not found"
➡️ Assurez-vous d'avoir créé le preset `signalements` en mode **Unsigned**

### Erreur: "Upload failed"
➡️ Vérifiez votre connexion Internet et que le preset est bien **Unsigned**

### Les images ne s'affichent pas
➡️ Vérifiez la console pour voir les URLs Cloudinary retournées
➡️ Vérifiez que les URLs commencent par `https://res.cloudinary.com/`

## 📚 Ressources

- [Documentation Cloudinary Vue](https://cloudinary.com/documentation/vue_quick_start)
- [Upload Presets](https://cloudinary.com/documentation/upload_presets)
- [Transformations](https://cloudinary.com/documentation/image_transformations)
- [API Upload](https://cloudinary.com/documentation/image_upload_api_reference)

## 🎯 Prochaines étapes

Une fois Cloudinary configuré et testé:
1. ✅ Les images sont stockées de manière sécurisée
2. ✅ Les URLs sont automatiquement optimisées
3. ✅ Votre base de données Firestore reste légère (URLs au lieu de base64)
4. ✅ Chargement rapide grâce au CDN Cloudinary
