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
            lines="none"
            class="signalement-card"
          >
            <div class="signalement-content">
              <!-- Icône de catégorie -->
              <div class="category-icon" :style="{ backgroundColor: getMarkerStyle(signalement.title).color }">
                <span v-html="getCategoryIcon(signalement.title)"></span>
              </div>
              
              <!-- Photo du signalement -->
              <div v-if="signalement.photos && signalement.photos.length > 0" class="signalement-photo">
                <img :src="signalement.photos[0]" :alt="signalement.title" />
                <div v-if="signalement.photos.length > 1" class="photo-count">
                  +{{ signalement.photos.length - 1 }}
                </div>
              </div>
              
              <div class="signalement-info">
                <div class="title-row">
                  <h3>{{ signalement.title }}</h3>
                  <span class="category-label" :style="{ color: getMarkerStyle(signalement.title).color }">{{ getMarkerStyle(signalement.title).label }}</span>
                </div>
                <p class="description">{{ signalement.description }}</p>
                <div class="meta-info">
                  <div class="status-badge" :class="'status-' + signalement.status">
                    {{ getStatusLabel(signalement.status) }}
                  </div>
                  <ion-text v-if="signalement.createdAt" color="medium" class="date">
                    📅 {{ formatDate(signalement.createdAt) }}
                  </ion-text>
                </div>
                <div v-if="signalement.surfaceM2 || signalement.budget" class="details">
                  <span v-if="signalement.surfaceM2" class="detail-item">
                    📐 {{ signalement.surfaceM2 }} m²
                  </span>
                  <span v-if="signalement.budget" class="detail-item">
                    💰 {{ formatBudget(signalement.budget) }} MGA
                  </span>
                </div>
              </div>
              
              <!-- Bouton voir sur carte -->
              <ion-button
                fill="solid"
                @click="viewOnMap(signalement)"
                class="view-button"
                title="Voir sur la carte"
                color="warning"
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
import { onIonViewWillEnter } from '@ionic/vue';
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
  // Naviguer vers la carte avec les coordonnées et ID du signalement
  router.push({
    path: '/tabs/tab1',
    query: {
      id: signalement.id,
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

const getStatusLabel = (status: SignalementStatus) => {
  switch (status) {
    case 'nouveau':
      return '🆕 Nouveau';
    case 'en_cours':
      return '🔄 En cours';
    case 'termine':
      return '✅ Terminé';
    default:
      return status;
  }
};

const formatBudget = (budget: number) => {
  return new Intl.NumberFormat('fr-FR').format(budget);
};

// Fonction pour obtenir le style du marqueur (couleur + type + label)
const getMarkerStyle = (title: string): { color: string; icon: string; label: string } => {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('construction') || titleLower.includes('travaux') || titleLower.includes('chantier')) {
    return { color: '#FFC107', icon: 'construction', label: 'En construction' };
  }
  else if (titleLower.includes('accident') || titleLower.includes('collision')) {
    return { color: '#F44336', icon: 'accident', label: 'Accident' };
  }
  else if (titleLower.includes('nid de poule') || titleLower.includes('trou') || titleLower.includes('chaussée')) {
    return { color: '#607D8B', icon: 'niddepoule', label: 'Nid de poule' };
  }
  else if (titleLower.includes('réparé') || titleLower.includes('repare') || titleLower.includes('terminé') || titleLower.includes('résolu')) {
    return { color: '#4CAF50', icon: 'repare', label: 'Réparé' };
  }
  else if (titleLower.includes('abimé') || titleLower.includes('abime') || titleLower.includes('dégradé') || titleLower.includes('cassé')) {
    return { color: '#FF9800', icon: 'abime', label: 'Abimé' };
  }
  else if (titleLower.includes('alerte') || titleLower.includes('urgence') || titleLower.includes('feu') || titleLower.includes('incendie')) {
    return { color: '#FF5722', icon: 'alerte', label: 'Alerte' };
  }
  else if (titleLower.includes('zone rouge') || titleLower.includes('danger') || titleLower.includes('interdit')) {
    return { color: '#E91E63', icon: 'zonerouge', label: 'Zone rouge' };
  }
  else if (titleLower.includes('eau') || titleLower.includes('fuite') || titleLower.includes('inondation') || titleLower.includes('canalisation')) {
    return { color: '#2196F3', icon: 'eau', label: 'Fuite / Eau' };
  }
  else if (titleLower.includes('eft') || titleLower.includes('électricité') || titleLower.includes('electricité') || titleLower.includes('éclairage') || titleLower.includes('lampadaire')) {
    return { color: '#03A9F4', icon: 'eft', label: 'EFT' };
  }
  else if (titleLower.includes('déchet') || titleLower.includes('ordure') || titleLower.includes('poubelle')) {
    return { color: '#8BC34A', icon: 'dechet', label: 'Déchet' };
  }
  else {
    return { color: '#9E9E9E', icon: 'autre', label: 'Autre' };
  }
};

// Fonction pour obtenir l'icône SVG de catégorie
const getCategoryIcon = (title: string): string => {
  const style = getMarkerStyle(title);
  const icons: Record<string, string> = {
    construction: '⚠️',
    accident: '❗',
    niddepoule: '⭕',
    repare: '✅',
    abime: '⚠️',
    alerte: '🔥',
    zonerouge: '🔴',
    eau: '💧',
    eft: '❓',
    dechet: '🗑️',
    autre: '❓',
  };
  return icons[style.icon] || '❓';
};

onMounted(() => {
  loadSignalements();
});

// Rafraîchir la liste à chaque fois qu'on entre sur la page
onIonViewWillEnter(() => {
  console.log('[SignalementListPage] Rafraîchissement de la liste...');
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

.signalement-card {
  --background: white;
  --border-radius: 16px;
  --padding-start: 0;
  --padding-end: 0;
  margin-bottom: 16px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.signalement-content {
  display: flex;
  align-items: flex-start;
  width: 100%;
  gap: 12px;
  padding: 16px;
}

.category-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.signalement-photo {
  position: relative;
  flex-shrink: 0;
  width: 70px;
  height: 70px;
  border-radius: 12px;
  overflow: hidden;
  background: #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.signalement-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-count {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 8px;
}

.signalement-info {
  flex: 1;
  min-width: 0;
}

.title-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}

.signalement-info h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.3;
}

.category-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.description {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-nouveau {
  background: #FFF3CD;
  color: #856404;
}

.status-en_cours {
  background: #CCE5FF;
  color: #004085;
}

.status-termine {
  background: #D4EDDA;
  color: #155724;
}

.date {
  font-size: 11px;
  color: #888;
}

.details {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-item {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 3px 8px;
  border-radius: 6px;
}

ion-badge {
  padding: 4px 8px;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
}

.view-button {
  flex-shrink: 0;
  --border-radius: 12px;
  --padding-start: 12px;
  --padding-end: 12px;
  min-width: 48px;
  height: 48px;
  margin-top: 8px;
}

.view-button ion-icon {
  font-size: 22px;
  color: white;
}
</style>
