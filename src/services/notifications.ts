import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { Router } from 'vue-router';

// Référence au router pour la navigation
let appRouter: Router | null = null;

/**
 * Configure le router pour la navigation depuis les notifications
 */
export function setNotificationRouter(router: Router): void {
  appRouter = router;
}

/**
 * Configure le listener pour le clic sur les notifications
 */
export async function setupNotificationListeners(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Listener quand l'utilisateur clique sur une notification
  await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    console.log('[Notifications] Notification cliquée:', notification);
    
    const extra = notification.notification.extra;
    if (extra && extra.signalementId && extra.type === 'status_change') {
      console.log('[Notifications] Navigation vers signalement:', extra.signalementId);
      
      // Naviguer vers la carte avec le signalement
      if (appRouter) {
        // Récupérer les coordonnées depuis le localStorage si disponibles
        const storedData = localStorage.getItem('signalement_coords_' + extra.signalementId);
        let lat = '';
        let lng = '';
        
        if (storedData) {
          try {
            const coords = JSON.parse(storedData);
            lat = coords.lat;
            lng = coords.lng;
          } catch (e) {
            console.error('[Notifications] Erreur parsing coords:', e);
          }
        }
        
        appRouter.push({
          path: '/tabs/tab1',
          query: {
            id: extra.signalementId,
            lat: lat,
            lng: lng,
            zoom: '18',
            fromNotification: 'true'
          }
        });
      }
    }
  });

  console.log('[Notifications] Listeners configurés');
}

/**
 * Initialise les notifications locales (demande de permission + création du canal)
 */
export async function initNotifications(): Promise<boolean> {
  // Ne pas initialiser sur le web
  if (!Capacitor.isNativePlatform()) {
    console.log('[Notifications] Plateforme web détectée, notifications natives désactivées');
    return false;
  }

  try {
    // Créer le canal de notification pour Android
    await LocalNotifications.createChannel({
      id: 'signalement_status',
      name: 'Statut des signalements',
      description: 'Notifications de changement de statut des signalements',
      importance: 5, // Max importance
      visibility: 1, // Public
      sound: 'default',
      vibration: true,
      lights: true,
    });
    console.log('[Notifications] Canal créé avec succès');
    return true;
  } catch (error) {
    console.error('[Notifications] Erreur création canal:', error);
    return false;
  }
}

/**
 * Vérifie et demande la permission pour les notifications
 */
export async function checkNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const permission = await LocalNotifications.checkPermissions();
    
    if (permission.display === 'granted') {
      return true;
    }
    
    if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    }
    
    return false;
  } catch (error) {
    console.error('[Notifications] Erreur vérification permission:', error);
    return false;
  }
}

/**
 * Formate le statut pour l'affichage
 */
function formatStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    'nouveau': '🆕 Nouveau',
    'en_cours': '🔄 En cours',
    'termine': '✅ Terminé',
  };
  return statusLabels[status] || status;
}

/**
 * Affiche une notification native pour un changement de statut
 */
export async function showStatusChangeNotification(
  signalementTitle: string,
  oldStatus: string,
  newStatus: string,
  signalementId: string,
  latitude?: number,
  longitude?: number
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Notifications] Web: notification non affichée (plateforme non native)');
    return;
  }

  try {
    // Vérifier/demander la permission
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.warn('[Notifications] Permission non accordée');
      return;
    }

    // Sauvegarder les coordonnées pour la navigation
    if (latitude !== undefined && longitude !== undefined) {
      localStorage.setItem('signalement_coords_' + signalementId, JSON.stringify({
        lat: latitude.toString(),
        lng: longitude.toString()
      }));
    }

    // Générer un ID unique pour la notification
    const notificationId = Math.floor(Math.random() * 100000);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: `📋 ${signalementTitle}`,
          body: `Statut changé: ${formatStatus(oldStatus)} → ${formatStatus(newStatus)}`,
          channelId: 'signalement_status',
          smallIcon: 'ic_stat_icon_config_sample',
          largeIcon: 'ic_launcher',
          extra: {
            signalementId: signalementId,
            type: 'status_change',
            lat: latitude?.toString() || '',
            lng: longitude?.toString() || '',
          },
          schedule: {
            at: new Date(Date.now() + 100), // Afficher immédiatement (après 100ms)
            allowWhileIdle: true,
          },
        },
      ],
    });

    console.log('[Notifications] Notification envoyée:', signalementTitle, oldStatus, '→', newStatus);
  } catch (error) {
    console.error('[Notifications] Erreur envoi notification:', error);
  }
}

/**
 * Affiche plusieurs notifications pour des changements de statut
 */
export async function showMultipleStatusChangeNotifications(
  changes: Array<{ id: string; title: string; oldStatus: string; newStatus: string }>
): Promise<void> {
  for (const change of changes) {
    await showStatusChangeNotification(
      change.title,
      change.oldStatus,
      change.newStatus,
      change.id
    );
  }
}
