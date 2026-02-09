import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Service pour gérer les notifications natives sur le téléphone
 */

// Initialiser les permissions de notifications
export async function initNotifications(): Promise<boolean> {
  try {
    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted';
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return false;
  }
}

// Vérifier si les notifications sont autorisées
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const permission = await LocalNotifications.checkPermissions();
    return permission.display === 'granted';
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    return false;
  }
}

// Afficher une notification native pour un changement de statut
export async function showStatusChangeNotification(
  signalementId: string,
  signalementTitle: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  try {
    // Générer un ID unique basé sur le timestamp
    const notificationId = Date.now() % 2147483647; // Max int32 pour Android

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: '📋 Mise à jour de signalement',
          body: `"${signalementTitle}" : ${oldStatus} → ${newStatus}`,
          largeBody: `Le signalement "${signalementTitle}" a changé de statut.\n\nAncien statut: ${oldStatus}\nNouveau statut: ${newStatus}`,
          summaryText: 'Changement de statut',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#488AFF',
          extra: {
            signalementId,
            oldStatus,
            newStatus
          }
        }
      ]
    });

    console.log(`Notification native envoyée pour signalement ${signalementId}`);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
  }
}

// Afficher plusieurs notifications de changement de statut
export async function showMultipleStatusChangeNotifications(
  changes: Array<{
    id: string;
    title: string;
    oldStatus: string;
    newStatus: string;
  }>
): Promise<void> {
  for (const change of changes) {
    await showStatusChangeNotification(
      change.id,
      change.title,
      change.oldStatus,
      change.newStatus
    );
    // Petit délai entre les notifications pour éviter les conflits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Annuler toutes les notifications en attente
export async function cancelAllNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [] });
  } catch (error) {
    console.error('Erreur lors de l\'annulation des notifications:', error);
  }
}

// Écouter les clics sur les notifications
export function addNotificationClickListener(
  callback: (signalementId: string) => void
): void {
  LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    const signalementId = notification.notification.extra?.signalementId;
    if (signalementId) {
      callback(signalementId);
    }
  });
}
