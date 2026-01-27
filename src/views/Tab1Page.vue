<template>
  <ion-page>
    <AppHeader @filter-change="handleFilterChange" />
    
    <ion-content :fullscreen="true" class="content-with-footer">
      <!-- Afficher uniquement la carte, pas de segment -->
      <div class="map-wrapper">
        <div ref="mapElement" class="map"></div>
        <div class="map-hint">
          <ion-text>Appuyez sur la carte pour signaler un probleme.</ion-text>
        </div>
      </div>

      <ion-modal :is-open="isModalOpen" @didDismiss="closeModal">
        <ion-header>
          <ion-toolbar>
            <ion-title>Nouveau signalement</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-item>
            <ion-label position="stacked">Type de signalement</ion-label>
            <ion-select v-model="form.title" placeholder="Sélectionnez un type" interface="action-sheet">
              <ion-select-option v-for="type in typeSignalements" :key="type.id" :value="type.libelle">
                {{ type.libelle }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Description</ion-label>
            <ion-textarea
              v-model="form.description"
              auto-grow
              placeholder="Decrivez le probleme"
            />
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Latitude</ion-label>
            <ion-input v-model="form.latitude" inputmode="decimal" />
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Longitude</ion-label>
            <ion-input v-model="form.longitude" inputmode="decimal" />
          </ion-item>

          <div class="button-row">
            <ion-button
              expand="block"
              color="medium"
              @click="fillLocation"
              :disabled="locating"
            >
              <ion-spinner v-if="locating" name="crescent" />
              <span v-else>Utiliser ma position</span>
            </ion-button>
          </div>

          <div class="button-row">
            <ion-button expand="block" @click="submit" :disabled="loading">
              <ion-spinner v-if="loading" name="crescent" />
              <span v-else>Envoyer le signalement</span>
            </ion-button>
          </div>

          <div v-if="message" class="message" :class="messageType">
            <ion-text :color="messageType" style="white-space: pre-wrap; word-break: break-word;">{{ message }}</ion-text>
          </div>
          
          <div class="debug-info" style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px; font-size: 12px;">
            <ion-text color="medium">
              <strong>Debug:</strong><br/>
              API: {{ apiUrlDebug }}<br/>
              User: {{ auth.currentUser?.email || 'Non connecté' }}
            </ion-text>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
    
    <AppFooter />
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
} from "@ionic/vue";
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
  fetchTypeSignalements,
} from "@/services/signalement";
import type { SignalementFormInput, TypeSignalement } from "@/services/signalement";
import type { SignalementRecord, SignalementStatus } from "@/types/signalement";

const route = useRoute();
const mapElement = ref<HTMLElement | null>(null);
const isModalOpen = ref(false);
const viewMode = ref<"map" | "mine">("map");
const statusFilter = ref<SignalementStatus | "all" | "mine">("all");

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
const typeSignalements = ref<TypeSignalement[]>([]);

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
};

const handleFilterChange = (filter: SignalementStatus | 'all' | 'mine') => {
  statusFilter.value = filter;
  // Rafraîchir les marqueurs sur la carte selon le filtre
  refreshSignalementMarkers();
};

const renderError = (text: string) => {
  message.value = text;
  messageType.value = "danger";
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
};

const submit = async () => {
  if (!auth.currentUser) {
    message.value = "Vous devez etre connecte pour envoyer un signalement.";
    messageType.value = "danger";
    return;
  }
  const payload = prepareSignalementPayload(form.value);
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
    message.value = "Signalement envoye avec succes.";
    messageType.value = "success";
    resetForm();
    if (auth.currentUser) {
      loadMySignalements();
    }
    await loadAllSignalements();
    refreshSignalementMarkers();
    closeModal();
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

const loadTypeSignalements = async () => {
  try {
    const types = await fetchTypeSignalements();
    typeSignalements.value = types;
  } catch (error: any) {
    console.error("Erreur chargement types signalements:", error);
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
  
  // Charger les types de signalements
  loadTypeSignalements();
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
.button-row {
  margin-top: 14px;
}

.message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.message.success {
  background-color: rgba(16, 220, 96, 0.1);
}

.message.danger {
  background-color: rgba(235, 68, 90, 0.1);
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
</style>
