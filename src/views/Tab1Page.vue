<template>
  <ion-page>
    <AppHeader ref="appHeaderRef" @filter-change="handleFilterChange" @refresh-signalements="refreshAllSignalements" />
    
    <ion-content :fullscreen="true" class="content-with-footer">
      <!-- Afficher uniquement la carte, pas de segment -->
      <div class="map-wrapper">
        <div ref="mapElement" class="map"></div>
        <div class="map-hint">
          <ion-text>Appuyez sur la carte pour signaler un probleme.</ion-text>
        </div>
      </div>

      <ion-modal :is-open="isModalOpen" @didDismiss="closeModal" class="signalement-modal">
        <ion-header class="modal-header">
          <ion-toolbar color="warning">
            <ion-title class="modal-title">📋 Nouveau signalement</ion-title>
            <ion-button slot="end" fill="clear" @click="closeModal" color="light">
              <ion-icon name="close-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-toolbar>
        </ion-header>
        <ion-content class="modal-content">
          <div class="form-container">
            <!-- Section: Informations principales -->
            <div class="form-section">
              <h3 class="section-title">📝 Informations</h3>
              
              <ion-item class="form-item title-select-item" lines="none" button @click="openTypeSelector">
                <ion-label position="stacked" class="form-label">Titre du signalement *</ion-label>
                <div class="custom-select-display">
                  <span :class="form.title ? 'select-value' : 'select-placeholder'">
                    {{ form.title || 'Sélectionnez un type de signalement' }}
                  </span>
                  <ion-icon name="chevron-down-outline" class="select-arrow"></ion-icon>
                </div>
              </ion-item>

              <ion-item class="form-item" lines="none">
                <ion-label position="stacked" class="form-label">Description *</ion-label>
                <ion-textarea
                  v-model="form.description"
                  auto-grow
                  :rows="4"
                  placeholder="Décrivez le problème en détail..."
                  class="form-textarea"
                />
              </ion-item>
            </div>

            <!-- Section: Photos -->
            <div class="form-section">
              <h3 class="section-title">📸 Photos</h3>
              
              <div class="photo-buttons">
                <ion-button 
                  expand="block" 
                  fill="outline" 
                  color="warning"
                  @click="handleSelectPhotos"
                  :disabled="photoComposable.isProcessing.value"
                  class="photo-button"
                >
                  <ion-icon slot="start" name="images-outline"></ion-icon>
                  Galerie
                </ion-button>
                
                <ion-button 
                  expand="block" 
                  fill="outline" 
                  color="warning"
                  @click="handleTakePhoto"
                  :disabled="photoComposable.isProcessing.value"
                  class="photo-button"
                >
                  <ion-icon slot="start" name="camera-outline"></ion-icon>
                  Appareil photo
                </ion-button>
              </div>

              <!-- Prévisualisation des photos -->
              <div v-if="photoComposable.photos.value.length > 0" class="photo-preview-container">
                <div class="photo-preview-header">
                  <span class="photo-count">{{ photoComposable.photos.value.length }} photo(s) sélectionnée(s)</span>
                  <ion-button 
                    size="small" 
                    fill="clear" 
                    color="danger"
                    @click="photoComposable.clearPhotos()"
                  >
                    Tout supprimer
                  </ion-button>
                </div>
                
                <div class="photo-grid">
                  <div 
                    v-for="photo in photoComposable.photos.value" 
                    :key="photo.id" 
                    class="photo-item"
                  >
                    <img :src="photo.webPath" alt="Photo" class="photo-thumbnail" />
                    <ion-button 
                      fill="solid" 
                      color="danger" 
                      size="small"
                      class="photo-delete-btn"
                      @click="photoComposable.removePhoto(photo.id)"
                    >
                      <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                    </ion-button>
                    <div v-if="photo.compressed" class="photo-badge">Compressée</div>
                  </div>
                </div>
              </div>

              <div v-if="photoComposable.isProcessing.value" class="processing-indicator">
                <ion-spinner name="crescent" color="warning"></ion-spinner>
                <span>Traitement de l'image...</span>
              </div>
            </div>

            <!-- Section: Localisation -->
            <div class="form-section">
              <h3 class="section-title">📍 Localisation</h3>
              
              <div class="location-row">
                <ion-item class="form-item location-input" lines="none">
                  <ion-label position="stacked" class="form-label">Latitude</ion-label>
                  <ion-input 
                    v-model="form.latitude" 
                    inputmode="decimal" 
                    readonly
                    class="form-input"
                  />
                </ion-item>

                <ion-item class="form-item location-input" lines="none">
                  <ion-label position="stacked" class="form-label">Longitude</ion-label>
                  <ion-input 
                    v-model="form.longitude" 
                    inputmode="decimal" 
                    readonly
                    class="form-input"
                  />
                </ion-item>
              </div>

              <ion-button
                expand="block"
                fill="outline"
                color="warning"
                @click="fillLocation"
                :disabled="locating"
                class="location-button"
              >
                <ion-icon slot="start" name="locate-outline"></ion-icon>
                <ion-spinner v-if="locating" name="crescent" />
                <span v-else>Utiliser ma position GPS</span>
              </ion-button>
            </div>

            <!-- Messages -->
            <div v-if="message" class="alert-message" :class="'alert-' + messageType">
              <ion-icon 
                :name="messageType === 'success' ? 'checkmark-circle' : 'alert-circle'" 
                class="alert-icon"
              ></ion-icon>
              <ion-text class="alert-text">{{ message }}</ion-text>
            </div>

            <!-- Bouton d'envoi -->
            <div class="submit-section">
              <ion-button
                expand="block"
                color="warning"
                @click="submit"
                :disabled="loading"
                class="submit-button"
              >
                <ion-icon slot="start" name="send-outline"></ion-icon>
                <ion-spinner v-if="loading" name="crescent" />
                <span v-else>Envoyer le signalement</span>
              </ion-button>
              
              <p class="form-hint">* Champs obligatoires</p>
            </div>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
    
    <AppFooter />
  import { getCurrentInstance } from 'vue';
  const appHeaderRef = ref();

  function syncNotificationsFromHome() {
    // Appelle la méthode du composant AppHeader
    if (appHeaderRef.value && typeof appHeaderRef.value.syncNotifications === 'function') {
      appHeaderRef.value.syncNotifications();
    } else if (appHeaderRef.value && appHeaderRef.value.$.exposed && typeof appHeaderRef.value.$.exposed.syncNotifications === 'function') {
      appHeaderRef.value.$.exposed.syncNotifications();
    }
  }
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonText,
  IonSpinner,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonIcon,
  actionSheetController,
} from "@ionic/vue";
import { addIcons } from "ionicons";
import {
  closeOutline,
  imagesOutline,
  cameraOutline,
  locateOutline,
  sendOutline,
  alertCircle,
  trashOutline,
  chevronDownOutline,
} from "ionicons/icons";

// Enregistrer les icônes utilisées dans le template
addIcons({
  "close-outline": closeOutline,
  "images-outline": imagesOutline,
  "camera-outline": cameraOutline,
  "locate-outline": locateOutline,
  "send-outline": sendOutline,
  "alert-circle": alertCircle,
  "trash-outline": trashOutline,
  "chevron-down-outline": chevronDownOutline,
});

import AppHeader from "@/components/AppHeader.vue";
import AppFooter from "@/components/AppFooter.vue";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { auth } from "@/Firebase/FirebaseConfig";

// Fix Leaflet default icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
import {
  fetchAllSignalements,
  fetchMySignalements,
  prepareSignalementPayload,
  submitSignalement,
} from "@/services/signalement";
import type { SignalementFormInput } from "@/services/signalement";
import type { SignalementRecord, SignalementStatus } from "@/types/signalement";
import { useSignalementPhotos } from "@/composables/useSignalementPhotos";
import { fetchTypesSignalement, type TypeSignalement } from "@/services/typeSignalement";

const route = useRoute();
const mapElement = ref<HTMLElement | null>(null);
const isModalOpen = ref(false);
const viewMode = ref<"map" | "mine">("map");
const statusFilter = ref<SignalementStatus | "all" | "mine">("all");

// Gestion des photos
const photoComposable = useSignalementPhotos();

// Types de signalement
const typesSignalement = ref<TypeSignalement[]>([]);

// Debug: Afficher l'URL de l'API configurée
const apiUrlDebug = import.meta.env.VITE_API_URL || 'http://localhost:3000 (défaut)';

let mapInstance: L.Map | null = null;
let marker: L.Marker | null = null;
let signalementLayer: L.LayerGroup | null = null;

const form = ref<SignalementFormInput>({
  title: "",
  description: "",
  surfaceM2: "",
  budget: "",
  latitude: "",
  longitude: "",
});

const loading = ref(false);
const locating = ref(false);
const message = ref("");
const messageType = ref<"" | "success" | "danger">("");
const mySignalements = ref<SignalementRecord[]>([]);
const allSignalements = ref<SignalementRecord[]>([]);
const loadingList = ref(false);
const listMessage = ref("Aucun signalement pour le moment.");
const loadingAll = ref(false);

const filteredMySignalements = computed(() => {
  if (statusFilter.value === "all") {
    return mySignalements.value;
  }
  return mySignalements.value.filter((item) => item.status === statusFilter.value);
});

const filteredAllSignalements = computed(() => {
  let filtered = allSignalements.value;

  // Filtrer par mes signalements
  if (statusFilter.value === 'mine') {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      return [];
    }
    filtered = filtered.filter((item) => item.userId === currentUserId);
  } else if (statusFilter.value !== 'all') {
    // Filtrer par statut
    filtered = filtered.filter((item) => item.status === statusFilter.value);
  }

  return filtered;
});

const closeModal = () => {
  isModalOpen.value = false;
  photoComposable.clearPhotos(); // Nettoyer les photos à la fermeture
};

const handleSelectPhotos = async () => {
  try {
    await photoComposable.selectPhotos();
  } catch (error: any) {
    if (error.message && !error.message.includes('cancelled')) {
      message.value = "Erreur lors de la sélection de photos";
      messageType.value = "danger";
    }
  }
};

const handleTakePhoto = async () => {
  try {
    await photoComposable.takePhoto();
  } catch (error: any) {
    if (error.message && !error.message.includes('cancelled')) {
      message.value = "Erreur lors de la prise de photo";
      messageType.value = "danger";
    }
  }
};

const handleFilterChange = (filter: SignalementStatus | 'all' | 'mine') => {
  statusFilter.value = filter;
  // Rafraîchir les marqueurs sur la carte selon le filtre
  refreshSignalementMarkers();
};

const refreshAllSignalements = async () => {
  await loadAllSignalements();
  await loadMySignalements();
  refreshSignalementMarkers();
};

const renderError = (text: string) => {
  message.value = text;
  messageType.value = "danger";
};

const openTypeSelector = async () => {
  const buttons = typesSignalement.value.map((type) => ({
    text: type.libelle,
    cssClass: form.value.title === type.libelle ? 'action-sheet-selected' : '',
    handler: () => {
      form.value.title = type.libelle;
      console.log('[Tab1Page] Sélection type:', type.libelle);
    },
  }));

  buttons.push({
    text: 'Annuler',
    cssClass: 'action-sheet-cancel',
    handler: () => {},
  });

  const actionSheet = await actionSheetController.create({
    header: 'Type de signalement',
    buttons,
  });

  await actionSheet.present();
};

const resetForm = () => {
  form.value = {
    title: "",
    description: "",
    surfaceM2: "",
    budget: "",
    latitude: "",
    longitude: "",
  };
  photoComposable.clearPhotos(); // Réinitialiser les photos
};

const submit = async () => {
  if (!auth.currentUser) {
    message.value = "Vous devez etre connecte pour envoyer un signalement.";
    messageType.value = "danger";
    return;
  }
  
  // Préparer le formulaire avec les URLs Cloudinary des photos
  const formWithPhotos = {
    ...form.value,
    photos: photoComposable.getPhotosUrls(),
  };
  
  const payload = prepareSignalementPayload(formWithPhotos);
  if (!payload.title || !payload.description) {
    message.value = "Titre et description sont obligatoires.";
    messageType.value = "danger";
    return;
  }
  if (payload.latitude == null || payload.longitude == null) {
    message.value = "Veuillez selectionner un point sur la carte.";
    messageType.value = "danger";
    return;
  }

  loading.value = true;
  message.value = "";
  messageType.value = "";

  try {
    await submitSignalement(payload);
    const photoCount = photoComposable.photos.value.length;
    message.value = `Signalement envoye avec succes${photoCount > 0 ? ` avec ${photoCount} photo(s)` : ''}.`;
    messageType.value = "success";
    resetForm();
    if (auth.currentUser) {
      loadMySignalements();
    }
    await loadAllSignalements();
    refreshSignalementMarkers();
    setTimeout(() => {
      closeModal();
    }, 1500);
  } catch (error: any) {
    message.value = `Erreur: ${error?.message ?? "envoi impossible"}`;
    messageType.value = "danger";
  } finally {
    loading.value = false;
  }
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const loadMySignalements = async () => {
  if (!auth.currentUser) {
    listMessage.value = "Connectez-vous pour voir vos signalements.";
    mySignalements.value = [];
    return;
  }

  loadingList.value = true;
  listMessage.value = "Chargement...";

  try {
    const items = await fetchMySignalements(auth.currentUser.uid);
    mySignalements.value = items;
    if (!items.length) {
      listMessage.value = "Aucun signalement pour le moment.";
    }
  } catch (error: any) {
    listMessage.value = error?.message ?? "Impossible de charger les signalements.";
  } finally {
    loadingList.value = false;
  }
};

const loadAllSignalements = async () => {
  loadingAll.value = true;
  try {
    allSignalements.value = await fetchAllSignalements();
  } catch (error: any) {
    message.value = error?.message ?? "Impossible de charger la carte.";
    messageType.value = "danger";
  } finally {
    loadingAll.value = false;
  }
};

const loadTypesSignalement = async () => {
  try {
    typesSignalement.value = await fetchTypesSignalement();
    console.log('[Tab1Page] Types de signalement chargés:', typesSignalement.value);
  } catch (error: any) {
    console.error("Erreur chargement types:", error);
    // On ne bloque pas l'utilisateur si les types ne se chargent pas
  }
};

const updateMarker = (latitude: number, longitude: number) => {
  if (!mapInstance) {
    return;
  }
  if (marker) {
    marker.setLatLng([latitude, longitude]);
  } else {
    marker = L.marker([latitude, longitude]).addTo(mapInstance);
  }
};

const refreshSignalementMarkers = () => {
  if (!mapInstance) {
    return;
  }

  if (!signalementLayer) {
    signalementLayer = L.layerGroup().addTo(mapInstance);
  }

  signalementLayer.clearLayers();

  filteredAllSignalements.value.forEach((item) => {
    if (item.latitude == null || item.longitude == null) {
      return;
    }

    const popup = `
      <strong>${item.title}</strong><br/>
      ${item.description}<br/>
      Statut: ${item.status}<br/>
      ${item.surfaceM2 ? `Surface: ${item.surfaceM2} m2<br/>` : ""}
      ${item.budget ? `Budget: ${item.budget} MGA<br/>` : ""}
    `;

    L.marker([item.latitude, item.longitude])
      .bindPopup(popup)
      .addTo(signalementLayer as L.LayerGroup);
  });
};

const fitMyBounds = () => {
  if (!mapInstance) {
    return;
  }

  const coords = filteredMySignalements.value
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => [item.latitude as number, item.longitude as number]);

  if (!coords.length) {
    message.value = "Aucun signalement a afficher.";
    messageType.value = "danger";
    return;
  }

  mapInstance.fitBounds(coords as L.LatLngBoundsExpression, { padding: [40, 40] });
};

const openSignalementModal = (latitude: number, longitude: number) => {
  form.value.latitude = latitude.toString();
  form.value.longitude = longitude.toString();
  updateMarker(latitude, longitude);
  message.value = "";
  messageType.value = "";
  isModalOpen.value = true;
};

const fillLocation = () => {
  if (!navigator.geolocation) {
    renderError("Geolocalisation non disponible.");
    return;
  }

  locating.value = true;
  message.value = "";
  messageType.value = "";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      openSignalementModal(position.coords.latitude, position.coords.longitude);
      locating.value = false;
    },
    () => {
      renderError("Impossible de recuperer la position.");
      locating.value = false;
    }
  );
};

onMounted(() => {
  if (!mapElement.value) {
    return;
  }

  // Charger les types de signalement
  loadTypesSignalement();

  mapInstance = L.map(mapElement.value).setView([-18.8792, 47.5079], 15);
  try {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapInstance);
    // ensure Leaflet recalculates container size after render
    setTimeout(() => {
      mapInstance?.invalidateSize();
    }, 300);
  } catch {
    renderError("Impossible de charger les tuiles de carte.");
  }

  mapInstance.on("click", (event: L.LeafletMouseEvent) => {
    openSignalementModal(event.latlng.lat, event.latlng.lng);
  });

  loadAllSignalements().then(() => {
    refreshSignalementMarkers();
    
    // Vérifier si on a des paramètres de navigation (lat, lng, zoom)
    const lat = route.query.lat as string;
    const lng = route.query.lng as string;
    const zoom = route.query.zoom as string;
    
    if (lat && lng && mapInstance) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const zoomLevel = zoom ? parseInt(zoom) : 18;
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        // Centrer la carte sur le signalement
        mapInstance.setView([latitude, longitude], zoomLevel);
        
        // Ajouter un marqueur temporaire pour mettre en évidence
        const highlightMarker = L.marker([latitude, longitude], {
          icon: L.icon({
            iconUrl: markerIcon,
            iconRetinaUrl: markerIcon2x,
            shadowUrl: markerShadow,
            iconSize: [35, 51],
            iconAnchor: [17, 51],
          })
        }).addTo(mapInstance);
        
        // Ouvrir le popup du marqueur s'il existe
        setTimeout(() => {
          highlightMarker.openPopup();
        }, 500);
      }
    }
  });

  if (auth.currentUser) {
    loadMySignalements().then(() => {
      refreshSignalementMarkers();
    });
  }
});

watch(
  viewMode,
  (current) => {
    if (current === "mine") {
      loadMySignalements();
    }
    if (current === "map") {
      if (!allSignalements.value.length && !loadingAll.value) {
        loadAllSignalements();
      }
      refreshSignalementMarkers();
      if (mapInstance) {
        setTimeout(() => {
          mapInstance?.invalidateSize();
        }, 200);
      }
    }
  },
  { immediate: false }
);

watch(
  () => form.value.title,
  (newTitle) => {
    console.log('[Tab1Page] form.title mis à jour:', newTitle);
  }
);

watch([mySignalements, allSignalements, statusFilter], () => {
  refreshSignalementMarkers();
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<style scoped>
/* Modal Styling */
.signalement-modal ion-modal {
  --height: 90%;
  --border-radius: 16px 16px 0 0;
}

.modal-header ion-toolbar {
  --background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
  --color: #000;
}

.modal-title {
  font-weight: 700;
  font-size: 1.2rem;
}

.modal-content {
  --background: #fafafa;
}

.form-container {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

/* Form Sections */
.form-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.1);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Form Items */
.form-item {
  --background: #f8f8f8;
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 8px;
  --padding-bottom: 8px;
  margin-bottom: 20px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.form-item:focus-within {
  --background: #fff;
  border-color: #ffc107;
  box-shadow: 0 0 0 3px rgba(255, 193, 7, 0.1);
}

.form-label {
  color: #333 !important;
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 8px !important;
  transform: none !important;
  position: relative !important;
}

.form-input,
.form-textarea,
.form-select {
  --color: #000 !important;
  --placeholder-color: #999 !important;
  font-size: 1rem;
}

/* Custom type selector */
.title-select-item {
  cursor: pointer;
}

.custom-select-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 40px;
  padding: 8px 0;
}

.select-value {
  color: #000;
  font-weight: 500;
  font-size: 1rem;
}

.select-placeholder {
  color: #666;
  font-size: 1rem;
}

.select-arrow {
  color: #ffc107;
  font-size: 18px;
  margin-left: 8px;
}

/* Style spécifique pour le select */
ion-select {
  --placeholder-color: #666 !important;
  --placeholder-opacity: 1 !important;
  color: #000 !important;
  font-weight: 500;
  min-height: 40px;
  display: flex;
  align-items: center;
}

ion-select::part(text) {
  color: #000 !important;
  font-weight: 500;
}

ion-select::part(placeholder) {
  color: #666 !important;
  opacity: 1 !important;
}

ion-select::part(icon) {
  color: #ffc107 !important;
  opacity: 1;
}

/* Photo Section */
.photo-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.photo-button {
  --border-width: 2px;
  --border-radius: 12px;
  font-weight: 600;
}

.photo-preview-container {
  margin-top: 16px;
}

.photo-preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.photo-count {
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.photo-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  --padding-start: 8px;
  --padding-end: 8px;
  height: 32px;
  width: 32px;
  margin: 0;
}

.photo-badge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(76, 175, 80, 0.9);
  color: white;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
}

.processing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 193, 7, 0.1);
  border-radius: 12px;
  margin-top: 12px;
  color: #666;
  font-weight: 500;
}

/* Location Section */
.location-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.location-input {
  margin-bottom: 0;
}

.location-button {
  --border-width: 2px;
  --border-radius: 12px;
  font-weight: 600;
  margin-top: 4px;
}

/* Alert Messages */
.alert-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.alert-success {
  background: rgba(76, 175, 80, 0.1);
  border: 2px solid rgba(76, 175, 80, 0.3);
}

.alert-danger {
  background: rgba(244, 67, 54, 0.1);
  border: 2px solid rgba(244, 67, 54, 0.3);
}

.alert-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.alert-success .alert-icon {
  color: #4caf50;
}

.alert-danger .alert-icon {
  color: #f44336;
}

.alert-text {
  color: #333;
  font-weight: 500;
  flex: 1;
}

/* Submit Section */
.submit-section {
  margin-top: 24px;
}

.submit-button {
  --border-radius: 12px;
  --box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
  font-weight: 700;
  font-size: 1rem;
  height: 56px;
  margin-bottom: 8px;
}

.form-hint {
  text-align: center;
  color: #999;
  font-size: 0.85rem;
  margin: 8px 0 0 0;
}

.content-with-footer {
  --background: var(--c-grey-100);
  padding-bottom: 0;
}

.map-wrapper {
  position: relative;
  height: calc(100vh - 150px);
  width: 100%;
  margin-top: 0;
}

.map {
  position: absolute;
  inset: 0;
  width: calc(100% - 24px);
  height: calc(100% - 24px);
  margin: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.map-hint {
  position: absolute; 
  left: 12px;
  right: 12px;
  bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 16px rgba(255, 193, 7, 0.15);
  color: var(--c-grey-700);
}

.map-controls {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 12px;
  padding: 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 6px 16px rgba(255, 193, 7, 0.15);
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 1000;
}

.list-wrapper {
  padding: 12px;
}

.empty-state {
  margin-top: 24px;
  text-align: center;
  padding: 2rem;
}

ion-item {
  --background: transparent;
  --border-color: var(--c-grey-300);
  --border-radius: 12px;
  --color: #000000;
  margin-bottom: 12px;
}

ion-modal ion-item {
  --background: #ffffff;
  --border-width: 1px;
  --border-style: solid;
  --border-color: #e0e0e0;
  --padding-start: 16px;
  --padding-end: 16px;
  --min-height: 50px;
}

ion-label {
  color: #000000 !important;
}

ion-input,
ion-textarea {
  --color: #000000 !important;
  --placeholder-color: #757575 !important;
}

ion-list {
  background: transparent;
  padding: 0;
}

ion-button {
  --border-radius: 12px;
}

/* Styles pour l'action sheet */
ion-action-sheet {
  --button-color: #000 !important;
  --button-color-selected: #ffc107 !important;
  --background: #fff !important;
}

ion-action-sheet .action-sheet-button {
  color: #000 !important;
}

ion-action-sheet .action-sheet-title {
  color: #000 !important;
}

ion-select-popover ion-item {
  --color: #000 !important;
  --background: #fff !important;
}

</style>
