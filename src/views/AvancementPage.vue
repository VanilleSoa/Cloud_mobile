<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Avancement des travaux</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true" class="content-with-footer">
      <div class="avancement-container">
        <!-- Loading state -->
        <div v-if="loading" class="loading-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <ion-text color="medium">Chargement des données...</ion-text>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="error-state">
          <ion-text color="danger">{{ error }}</ion-text>
        </div>

        <!-- Stats cards -->
        <div v-else class="stats-grid">
          <!-- Nombre de signalements -->
          <div class="stat-card">
            <div class="stat-icon">
              <ion-icon :icon="locationOutline" color="primary"></ion-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalSignalements }}</div>
              <div class="stat-label">Signalements</div>
            </div>
          </div>

          <!-- Surface totale -->
          <div class="stat-card">
            <div class="stat-icon">
              <ion-icon :icon="resizeOutline" color="warning"></ion-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalSurface }} m²</div>
              <div class="stat-label">Surface totale</div>
            </div>
          </div>

          <!-- Budget total -->
          <div class="stat-card">
            <div class="stat-icon">
              <ion-icon :icon="cashOutline" color="success"></ion-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatCurrency(stats.totalBudget) }}</div>
              <div class="stat-label">Budget total</div>
            </div>
          </div>

          <!-- Avancement -->
          <div class="stat-card stat-card--full">
            <div class="stat-icon">
              <ion-icon :icon="trendingUpOutline" color="tertiary"></ion-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.avancement }}%</div>
              <div class="stat-label">Avancement</div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: stats.avancement + '%' }"></div>
              </div>
            </div>
          </div>

          <!-- Répartition par statut -->
          <div class="stat-card stat-card--full">
            <h3 class="section-title">Répartition par statut</h3>
            <div class="status-breakdown">
              <div class="status-item">
                <ion-badge color="warning">Nouveau</ion-badge>
                <span class="status-count">{{ stats.nouveau }}</span>
              </div>
              <div class="status-item">
                <ion-badge color="primary">En cours</ion-badge>
                <span class="status-count">{{ stats.enCours }}</span>
              </div>
              <div class="status-item">
                <ion-badge color="success">Terminé</ion-badge>
                <span class="status-count">{{ stats.termine }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
    
    <AppFooter />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onIonViewWillEnter } from '@ionic/vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonText,
  IonIcon,
  IonSpinner,
  IonBadge,
} from '@ionic/vue';
import { locationOutline, resizeOutline, cashOutline, trendingUpOutline } from 'ionicons/icons';
import AppFooter from '@/components/AppFooter.vue';
import { fetchAllSignalements } from '@/services/signalement';
import type { SignalementRecord } from '@/types/signalement';

const loading = ref(false);
const error = ref('');
const signalements = ref<SignalementRecord[]>([]);

const stats = computed(() => {
  const total = signalements.value.length;
  const totalSurface = signalements.value.reduce((sum, item) => sum + (item.surfaceM2 || 0), 0);
  const totalBudget = signalements.value.reduce((sum, item) => sum + (item.budget || 0), 0);
  
  // Compter par statut
  const nouveau = signalements.value.filter(item => item.status === 'nouveau').length;
  const enCours = signalements.value.filter(item => item.status === 'en_cours').length;
  const termine = signalements.value.filter(item => item.status === 'termine').length;
  
  // Calculer l'avancement (terminé / total * 100)
  const avancement = total > 0 ? Math.round((termine / total) * 100) : 0;
  
  return {
    totalSignalements: total,
    totalSurface: totalSurface.toFixed(0),
    totalBudget,
    avancement,
    nouveau,
    enCours,
    termine,
  };
});

const loadSignalements = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    signalements.value = await fetchAllSignalements();
  } catch (err: any) {
    error.value = err?.message ?? 'Impossible de charger les données.';
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' MGA';
};

onMounted(() => {
  loadSignalements();
});

// Rafraîchir les données à chaque fois qu'on entre sur la page
onIonViewWillEnter(() => {
  console.log('[AvancementPage] Rafraîchissement des statistiques...');
  loadSignalements();
});
</script>

<style scoped>
.content-with-footer {
  --background: var(--c-grey-100);
}

.avancement-container {
  padding: 16px;
  padding-bottom: 80px;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 24px;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.stat-card--full {
  grid-column: 1 / -1;
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.stat-icon ion-icon {
  font-size: 28px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #000;
  margin-bottom: 4px;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #000;
  grid-column: 1 / -1;
}

.progress-bar {
  margin-top: 12px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFC107 0%, #FF9800 100%);
  border-radius: 4px;
  transition: width 0.6s ease;
}

.status-breakdown {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.status-count {
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

ion-badge {
  padding: 6px 12px;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 600;
}

@media (max-width: 360px) {
  .stat-value {
    font-size: 24px;
  }
  
  .stat-label {
    font-size: 12px;
  }
}
</style>
