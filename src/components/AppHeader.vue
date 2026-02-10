<template>
  <div class="app-header">
    <button class="app-header-btn app-header-btn--active" @click="openFilters">
      <!-- Icône de recherche -->
      <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" fill="currentColor" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="none"></rect>
        <circle cx="116" cy="116" r="84" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></circle>
        <line x1="175.39356" y1="175.40039" x2="223.99414" y2="224.00098" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
      </svg>
    </button>
    
    <h1 class="app-header-title">! CLIQUEZ POUR UN NOUVEAU SIGNALEMENT ! </h1>
    
    <button class="app-header-btn app-header-btn--sync" @click="syncNotifications" title="Synchroniser les notifications">
      <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" fill="currentColor" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="none"></rect>
        <path d="M176.16553,99.7168A71.94449,71.94449,0,1,0,127.99,200.62451" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
        <polyline points="224 104 176 104 176 56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></polyline>
        <line x1="188.0976" y1="147.9024" x2="224" y2="104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
      </svg>
    </button>

    <button class="app-header-btn app-header-btn--notification" @click="openNotifications" style="position:relative;">
      <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" fill="currentColor" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="none"></rect>
        <line x1="96" y1="224" x2="160" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
        <path d="M56.20305,104A71.899,71.899,0,0,1,128.5484,32.002c39.58967.29432,71.25651,33.20133,71.25651,72.90185V112c0,35.81563,7.49325,56.59893,14.093,67.95814A7.999,7.999,0,0,1,207.01628,192H48.98365A7.99908,7.99908,0,0,1,42.103,179.95641c6.60328-11.35959,14.1-32.1426,14.1-67.95641Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
      </svg>
      <span v-if="hasNotif" style="position:absolute;top:6px;right:6px;width:16px;height:16px;background:#eb445a;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;z-index:2;">!</span>
    </button>

    <div v-if="showNotifModal" class="notif-modal-bg" @click.self="closeNotifModal">
      <div class="notif-modal">
        <h3 class="notif-header">Notifications</h3>
        <div v-if="notifList.length === 0" class="empty-notif">Aucune notification.</div>
        <div v-else class="notif-list-scroll">
          <div v-for="(notif, idx) in [...notifList].reverse()" :key="notif.id + notif.oldStatus + notif.newStatus" class="notification-item-scroll">
            <div class="notif-title">{{ getSignalementTitle(notif.id) || 'Signalement inconnu' }}</div>
            <div class="notif-id">ID : {{ notif.id }}</div>
            <div class="notif-status-before">Statut avant : {{ notif.oldStatus }}</div>
            <div class="notif-status-after">Statut après : {{ notif.newStatus }}</div>
          </div>
        </div>
        <button @click="closeNotifModal" class="notif-close-btn">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { actionSheetController, toastController } from '@ionic/vue';
import { auth } from '@/Firebase/FirebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { listenMySignalementsStatus } from '@/services/signalement';
import type { SignalementRecord } from '@/types/signalement';
import { initNotifications, showStatusChangeNotification, checkNotificationPermission } from '@/services/notifications';
import { Capacitor } from '@capacitor/core';

const emit = defineEmits(['filter-change', 'refresh-signalements']);

const lastSignalements = ref<SignalementRecord[]>([]);

function getSignalementTitle(id: string) {
  console.log('[DEBUG] getSignalementTitle called with id:', id);
  
  // Chercher par document ID (Firestore)
  let found = lastSignalements.value.find((s) => s.id === id);
  if (!found) {
    // Chercher par champ ID numérique 
    found = lastSignalements.value.find((s) => s.id == id);
  }
  
  console.log('[DEBUG] found signalement:', found);
  return found ? (found.title || 'Signalement sans titre') : 'Signalement';
}

const hasNotif = ref(false);
const notifList = ref<Array<{id:string, oldStatus:string, newStatus:string}>>([]);

// Charger les notifications sauvegardées au démarrage
const NOTIF_STORAGE_KEY = 'signalement_notifications';
const savedNotifs = localStorage.getItem(NOTIF_STORAGE_KEY);
if (savedNotifs) {
  try {
    notifList.value = JSON.parse(savedNotifs);
  } catch (e) {
    notifList.value = [];
  }
}
const showNotifModal = ref(false);
let unsubscribe: (() => void) | null = null;
let authUnsubscribe: (() => void) | null = null;

// Stockage des derniers statuts connus (persisté)
const LAST_STATUSES_KEY = 'signalement_last_statuses';

function startSignalementListener() {
  // Arrêter l'ancien listener si existant
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  
  // Charger les statuts précédemment connus
  let savedStatuses: Record<string, string> = {};
  try {
    const saved = localStorage.getItem(LAST_STATUSES_KEY);
    if (saved) savedStatuses = JSON.parse(saved);
  } catch (e) {
    savedStatuses = {};
  }
  
  let isFirstLoad = true;
  
  unsubscribe = listenMySignalementsStatus('', async (signalements, changesFromListener) => {
    lastSignalements.value = signalements as SignalementRecord[];
    
    console.log('[AppHeader] Signalements reçus:', signalements.length);
    console.log('[AppHeader] Changes from listener:', changesFromListener);
    
    // Détecter les changements par rapport aux statuts sauvegardés
    const allChanges: {id: string, oldStatus: string, newStatus: string}[] = [];
    
    for (const s of signalements) {
      const oldSaved = savedStatuses[s.id];
      if (oldSaved && oldSaved !== s.status) {
        allChanges.push({ id: s.id, oldStatus: oldSaved, newStatus: s.status });
      }
      // Mettre à jour le statut sauvegardé
      savedStatuses[s.id] = s.status;
    }
    
    // Persister les statuts
    localStorage.setItem(LAST_STATUSES_KEY, JSON.stringify(savedStatuses));
    
    // Si c'est la première charge, on ne notifie que les changements détectés
    const changesToNotify = isFirstLoad ? allChanges : [...changesFromListener, ...allChanges.filter(c => !changesFromListener.find(cl => cl.id === c.id))];
    isFirstLoad = false;
    
    console.log('[AppHeader] Changes to notify:', changesToNotify);
    
    if (changesToNotify.length > 0) {
      // Afficher un toast pour debug
      const toast = await toastController.create({
        message: `🔔 ${changesToNotify.length} changement(s) de statut détecté(s)`,
        duration: 3000,
        position: 'top',
        color: 'warning'
      });
      await toast.present();
      
      // Envoyer une notification native pour chaque changement
      for (const change of changesToNotify) {
        const signalement = signalements.find((s: any) => s.id === change.id) as SignalementRecord | undefined;
        const title = signalement?.title || getSignalementTitle(change.id);
        
        console.log('[AppHeader] Envoi notification pour:', title, change.oldStatus, '->', change.newStatus);
        
        await showStatusChangeNotification(
          title,
          change.oldStatus,
          change.newStatus,
          change.id,
          signalement?.latitude ?? undefined,
          signalement?.longitude ?? undefined
        );
      }
      
      // Persister dans le localStorage (backup)
      notifList.value = [...notifList.value, ...changesToNotify];
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifList.value));
      hasNotif.value = true;
    }
  });
}

onMounted(async () => {
  // Initialiser les notifications natives
  await initNotifications();
  
  // Demander la permission immédiatement
  if (Capacitor.isNativePlatform()) {
    const hasPermission = await checkNotificationPermission();
    console.log('[AppHeader] Permission notifications:', hasPermission);
  }
  
  // Écouter les changements d'authentification
  authUnsubscribe = onAuthStateChanged(auth, (user) => {
    console.log('[AppHeader] Auth state changed, user:', user?.email);
    if (user) {
      // Démarrer le listener quand l'utilisateur est connecté
      startSignalementListener();
    } else {
      // Arrêter le listener si déconnecté
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    }
  });
});
onUnmounted(() => {
  if (unsubscribe) unsubscribe();
  if (authUnsubscribe) authUnsubscribe();
});

const openFilters = async () => {
  const actionSheet = await actionSheetController.create({
    header: 'Filtrer les signalements',
    buttons: [
      {
        text: 'Tous mes signalements',
        handler: () => {
          emit('filter-change', 'all');
        }
      },
      {
        text: 'Mes signalements',
        handler: () => {
          emit('filter-change', 'mine');
        }
      },
      {
        text: 'Nouveau',
        handler: () => {
          emit('filter-change', 'nouveau');
        }
      },
      {
        text: 'En cours',
        handler: () => {
          emit('filter-change', 'en_cours');
        }
      },
      {
        text: 'Terminé',
        handler: () => {
          emit('filter-change', 'termine');
        }
      },
      {
        text: 'Annuler',
        role: 'cancel'
      }
    ]
  });

  await actionSheet.present();
};

const openNotifications = () => {
  hasNotif.value = false;
  showNotifModal.value = true;
};

const closeNotifModal = () => {
  showNotifModal.value = false;
};

// Synchronisation manuelle des notifications depuis Firebase
async function syncNotifications() {
  const user = auth.currentUser;
  if (!user) {
    const toast = await toastController.create({
      message: '⚠️ Vous devez être connecté',
      duration: 2000,
      color: 'warning',
      position: 'bottom'
    });
    await toast.present();
    return;
  }
  
  // Afficher un toast de chargement
  const loadingToast = await toastController.create({
    message: '🔄 Synchronisation en cours...',
    duration: 1500,
    color: 'primary',
    position: 'bottom'
  });
  await loadingToast.present();
  
  // Redémarrer le listener pour forcer une nouvelle lecture de Firebase
  startSignalementListener();
  
  // Émet un événement pour que le parent rafraîchisse les signalements
  emit('refresh-signalements');
  
  // Afficher un toast de succès après 1.5s
  setTimeout(async () => {
    const successToast = await toastController.create({
      message: '✅ Synchronisation terminée',
      duration: 2000,
      color: 'success',
      position: 'bottom'
    });
    await successToast.present();
  }, 1500);
}

defineExpose({ syncNotifications });
</script>

<style scoped>
/* Styles are in variables.css */

.notif-modal-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  z-index: 9999;
  pointer-events: none;
}
.notif-modal {
  position: absolute;
  top: 56px;
  right: 16px;
  background: #fff;
  padding: 12px 10px;
  border-radius: 12px;
  min-width: 240px;
  max-width: 280px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}
.notif-header {
  margin: 0 0 12px 0;
  padding: 0;
  font-size: 1.1em;
  font-weight: 600;
  color: #222;
  text-align: center;
}
.empty-notif {
  text-align: center;
  color: #666;
  padding: 1em 0;
  font-size: 0.95em;
}
.notif-list-scroll {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
}
.notification-item-scroll {
  padding: 0.8em 0.7em;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  width: 100%;
  box-sizing: border-box;
}
.notif-title {
  font-size: 1.05em;
  font-weight: 600;
  color: #111;
  margin-bottom: 0.5em;
  line-height: 1.3;
}
.notif-id {
  font-size: 0.9em;
  color: #6b7280;
  margin-bottom: 0.4em;
}
.notif-status-before {
  font-size: 0.92em;
  color: #d97706;
  margin-bottom: 0.3em;
  font-weight: 500;
}
.notif-status-after {
  font-size: 0.92em;
  color: #2563eb;
  font-weight: 500;
}
.notif-close-btn {
  margin-top: 10px;
  width: 100%;
  font-size: 0.95em;
  padding: 0.6em 0;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}
.notif-close-btn:hover {
  background: #1d4ed8;
}
</style>
