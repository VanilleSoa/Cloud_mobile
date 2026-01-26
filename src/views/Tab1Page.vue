<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Signalement</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Signalement</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="hero-panel">
        <p class="section-heading">Signalement</p>
        <h2>Cartographie communautaire en live</h2>
        <p>
          Activez vos signalements et suivez ceux des riverains en un clin d'œil.
          Touchez la carte pour ajouter un point ou consultez votre historique.
        </p>
        <div class="quick-action-grid">
          <ion-button expand="block" color="primary" @click="startNewSignalement">
            Ajouter un signalement
          </ion-button>
          <ion-button expand="block" fill="outline" color="light" @click="switchToMine">
            Mes signalements
          </ion-button>
        </div>
      </div>

      <div class="idea-panel glass-card">
        <div class="section-heading">Idées utiles</div>
        <ul>
          <li><strong>Filtre express : </strong>concentrez-vous sur les statuts prioritaires en filtrant rapidement depuis la sélection.</li>
          <li><strong>Mode "map" : </strong>déposez un signalement en touchant la carte et validez directement la latitude/longitude.</li>
          <li><strong>Suivi perso : </strong>rafraîchissez vos signalements pour voir les mises à jour et budgets renseignés.</li>
        </ul>
      </div>

      <div class="segment-wrapper">
        <ion-segment v-model="viewMode" value="map">
          <ion-segment-button value="map">
            <ion-label>Carte</ion-label>
          </ion-segment-button>
          <ion-segment-button value="mine">
            <ion-label>Mes signalements</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <div v-if="viewMode === 'map'" class="map-section">
        <div class="map-wrapper">
          <div ref="mapElement" class="map"></div>
        </div>
        <div class="map-controls">
          <ion-item lines="none">
            <ion-label>Statut</ion-label>
            <ion-select v-model="statusFilter" interface="popover">
              <ion-select-option value="all">Tous</ion-select-option>
              <ion-select-option value="nouveau">Nouveau</ion-select-option>
              <ion-select-option value="en_cours">En cours</ion-select-option>
              <ion-select-option value="termine">Termine</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-button expand="block" color="medium" @click="fitMyBounds">
            Voir mes signalements
          </ion-button>
        </div>
        <div class="map-hint">
          <ion-text>Appuyez sur la carte pour signaler un probleme.</ion-text>
        </div>
      </div>

      <div v-else class="list-wrapper">
        <div class="button-row">
          <ion-button expand="block" color="medium" @click="loadMySignalements" :disabled="loadingList">
            <ion-spinner v-if="loadingList" name="crescent" />
            <span v-else>Actualiser</span>
          </ion-button>
        </div>

        <div class="section-heading" style="margin: 0 12px 12px;">Mes signalements récents</div>

        <ion-list v-if="filteredMySignalements.length">
          <ion-item v-for="item in filteredMySignalements" :key="item.id">
            <ion-label>
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
              <p v-if="item.createdAt">Le {{ formatDate(item.createdAt) }}</p>
            </ion-label>
            <ion-note slot="end">
              <ion-badge :color="statusColor(item.status)" class="status-badge">{{ item.status }}</ion-badge>
              <div v-if="item.surfaceM2">Surface: {{ item.surfaceM2 }} m2</div>
              <div v-if="item.budget">Budget: {{ item.budget }} MGA</div>
            </ion-note>
          </ion-item>
        </ion-list>

        <div v-else class="empty-state">
          <ion-text color="medium">
            {{ listMessage }}
          </ion-text>
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
            <ion-label position="floating">Titre</ion-label>
            <ion-input v-model="form.title" placeholder="Nid de poule, route abimee..." />
          </ion-item>

          <ion-item>
            <ion-label position="floating">Description</ion-label>
            <ion-textarea
              v-model="form.description"
              auto-grow
              placeholder="Decrivez le probleme"
            />
          </ion-item>

          <ion-item>
            <ion-label position="floating">Surface (m2)</ion-label>
            <ion-input v-model="form.surfaceM2" inputmode="decimal" />
          </ion-item>

          <ion-item>
            <ion-label position="floating">Budget (MGA)</ion-label>
            <ion-input v-model="form.budget" inputmode="decimal" />
          </ion-item>

          <ion-item>
            <ion-label position="floating">Latitude</ion-label>
            <ion-input v-model="form.latitude" inputmode="decimal" />
          </ion-item>

          <ion-item>
            <ion-label position="floating">Longitude</ion-label>
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
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
  IonBadge,
} from "@ionic/vue";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { auth } from "@/Firebase/FirebaseConfig";
import {
  fetchAllSignalements,
  fetchMySignalements,
  prepareSignalementPayload,
  submitSignalement,
} from "@/services/signalement";
import type { SignalementFormInput } from "@/services/signalement";
import type { SignalementRecord, SignalementStatus } from "@/types/signalement";

const mapElement = ref<HTMLElement | null>(null);
const isModalOpen = ref(false);
const viewMode = ref<"map" | "mine">("map");
const statusFilter = ref<SignalementStatus | "all">("all");

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
  if (statusFilter.value === "all") {
    return allSignalements.value;
  }
  return allSignalements.value.filter((item) => item.status === statusFilter.value);
});

const closeModal = () => {
  isModalOpen.value = false;
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

const startNewSignalement = () => {
  resetForm();
  message.value = "";
  messageType.value = "";
  isModalOpen.value = true;
};

const switchToMine = () => {
  viewMode.value = "mine";
  loadMySignalements();
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
    loadAllSignalements();
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

const statusColor = (status: SignalementStatus) => {
  switch (status) {
    case "nouveau":
      return "warning";
    case "en_cours":
      return "primary";
    case "termine":
      return "success";
    default:
      return "medium";
  }
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

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });

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

.segment-wrapper {
  padding: 8px 12px 0;
}

.list-wrapper {
  padding: 0 12px 24px;
}

.map-section {
  margin: 0 12px 24px;
}

.map-wrapper {
  border-radius: 20px;
  overflow: hidden;
  min-height: 360px;
  position: relative;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
}

.map {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-hint {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(2, 6, 12, 0.85);
  color: #f8fafc;
  font-size: 0.9rem;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45);
}

.map-controls {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(5, 11, 26, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

.idea-panel ul {
  padding-left: 1rem;
  margin: 10px 0 0;
  line-height: 1.5;
  font-size: 0.95rem;
}

.idea-panel li + li {
  margin-top: 8px;
}

.status-badge {
  margin-bottom: 6px;
  font-size: 0.75rem;
}

.empty-state {
  margin-top: 24px;
  text-align: center;
}
</style>
