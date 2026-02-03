<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Tous les signalements</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true" class="content-with-footer">
      <div class="list-container">
        <!-- Filtre par statut -->
        <div class="filter-section">
          <ion-item lines="none">
            <ion-label>Filtrer par :</ion-label>
            <ion-select v-model="statusFilter" interface="action-sheet" placeholder="Sélectionner">
              <ion-select-option value="all">Tous les signalements</ion-select-option>
              <ion-select-option value="mine">Mes signalements</ion-select-option>
              <ion-select-option value="nouveau">Nouveaux</ion-select-option>
              <ion-select-option value="en_cours">En cours</ion-select-option>
              <ion-select-option value="termine">Terminés</ion-select-option>
            </ion-select>
          </ion-item>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <ion-text color="medium">Chargement des signalements...</ion-text>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <ion-text color="danger">{{ error }}</ion-text>
        </div>

        <!-- Empty state -->
        <div v-else-if="!filteredSignalements.length" class="empty-state">
          <ion-text color="medium">Aucun signalement trouvé.</ion-text>
        </div>

        <!-- List of signalements -->
        <ion-list v-else>
          <ion-item
            v-for="signalement in filteredSignalements"
            :key="signalement.id"
            lines="full"
          >
            <div class="signalement-content">
              <div class="signalement-info">
                <h3>{{ signalement.title }}</h3>
                <p class="description">{{ signalement.description }}</p>
                <div class="meta-info">
                  <ion-badge :color="getStatusColor(signalement.status)">
                    {{ signalement.status }}
                  </ion-badge>
                  <ion-text v-if="signalement.createdAt" color="medium" class="date">
                    {{ formatDate(signalement.createdAt) }}
                  </ion-text>
                </div>
                <div v-if="signalement.surfaceM2 || signalement.budget" class="details">
                  <ion-text v-if="signalement.surfaceM2" color="medium" class="detail-item">
                    📏 {{ signalement.surfaceM2 }} m²
                  </ion-text>
                  <ion-text v-if="signalement.budget" color="medium" class="detail-item">
                    💰 {{ signalement.budget }} MGA
                  </ion-text>
                </div>
              </div>
              <ion-button
                fill="clear"
                @click="viewOnMap(signalement)"
                class="view-button"
              >
                <ion-icon :icon="eyeOutline" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
    
    <AppFooter />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonText,
  IonButton,
  IonIcon,
  IonSpinner,
  IonLabel,
  IonBadge,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue';
import { eyeOutline } from 'ionicons/icons';
import AppFooter from '@/components/AppFooter.vue';
import { fetchAllSignalements } from '@/services/signalement';
import type { SignalementRecord, SignalementStatus } from '@/types/signalement';
import { auth } from '@/Firebase/FirebaseConfig';

const router = useRouter();
const signalements = ref<SignalementRecord[]>([]);
const loading = ref(false);
const error = ref('');
const statusFilter = ref<SignalementStatus | 'all' | 'mine'>('all');

const filteredSignalements = computed(() => {
  let filtered = signalements.value;

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

const loadSignalements = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    signalements.value = await fetchAllSignalements();
  } catch (err: any) {
    error.value = err?.message ?? 'Impossible de charger les signalements.';
  } finally {
    loading.value = false;
  }
};

const handleFilterChange = () => {
  // Le filtrage est automatique via computed
};

const viewOnMap = (signalement: SignalementRecord) => {
  // Naviguer vers la carte avec les coordonnées du signalement
  router.push({
    path: '/tabs/tab1',
    query: {
      lat: signalement.latitude?.toString(),
      lng: signalement.longitude?.toString(),
      zoom: '18'
    }
  });
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getStatusColor = (status: SignalementStatus) => {
  switch (status) {
    case 'nouveau':
      return 'warning';
    case 'en_cours':
      return 'primary';
    case 'termine':
      return 'success';
    default:
      return 'medium';
  }
};

onMounted(() => {
  loadSignalements();
});
</script>

<style scoped>
.content-with-footer {
  --background: var(--c-grey-100);
}

.list-container {
  padding: 12px;
  padding-bottom: 80px;
}

.filter-section {
  margin-bottom: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-section ion-item {
  --background: white;
  --padding-start: 16px;
  --padding-end: 16px;
  --border-radius: 12px;
  --min-height: 56px;
}

.filter-section ion-label {
  font-weight: 600;
  color: #000;
  font-size: 14px;
}

.filter-section ion-select {
  --padding-start: 8px;
  font-weight: 500;
  color: #FFC107;
  max-width: 100%;
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  text-align: center;
}

ion-list {
  background: transparent;
  padding: 0;
}

ion-item {
  --background: white;
  --border-radius: 12px;
  --padding-start: 16px;
  --padding-end: 16px;
  margin-bottom: 12px;
  border-radius: 12px;
}

.signalement-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
  padding: 12px 0;
}

.signalement-info {
  flex: 1;
  min-width: 0;
}

.signalement-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #000;
}

.description {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.date {
  font-size: 12px;
}

.details {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.detail-item {
  font-size: 12px;
}

ion-badge {
  padding: 4px 8px;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
}

.view-button {
  --padding-start: 8px;
  --padding-end: 8px;
  --color: #FFC107;;
  min-width: 48px;
  height: 48px;
}

.view-button ion-icon {
  font-size: 24px;
  color: #FFC107;
}

.view-button:hover {
  --background: rgba(255, 193, 7, 0.431);
}
</style>
