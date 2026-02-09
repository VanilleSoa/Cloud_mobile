/**
 * Service API client pour les signalements
 * Utilisé par l'app web pour récupérer les données depuis le backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

console.log('[API] Base URL:', API_BASE_URL);

export interface SignalementApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

import { db } from '@/Firebase/FirebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';

export async function logLoginAttempt(email: string, success: boolean): Promise<void> {
  try {
    // Vérifier d'abord si l'utilisateur est déjà bloqué dans Firestore
    const userData = await getUserDataFromFirestore(email);
    
    if (!userData) {
      console.warn(`User ${email} not found in Firestore`);
      return;
    }
    
    // Si l'utilisateur est déjà marqué comme "Bloque" (statuts_user_id = 2)
    // ou si les tentatives ont dépassé la limite
    const maxAttempts = await getMaxLoginAttempts();
    const currentAttempts = userData.failed_login_attempts || 0;
    const isAlreadyBlocked = userData.statuts_user_id === 2 || currentAttempts >= maxAttempts;
    
    if (isAlreadyBlocked && !success) {
      console.log(`🚫 User ${email} tried to login but account is already blocked`);
      return; // Ne pas incrémenter si déjà bloqué
    }
    
    const userRef = doc(db, 'users', userData.id);
    
    if (success) {
      // SUCCÈS : réinitialiser à 0 et mettre statut "Actif"
      console.log(`✅ Login success for ${email} - resetting attempts`);
      
      const activeStatusId = await getStatusIdByLabel('Actif');
      
      const updates: any = {
        failed_login_attempts: 0,
        updated_at: new Date()
      };
      
      if (activeStatusId) {
        updates.statuts_user_id = activeStatusId;
      }
      
      await updateDoc(userRef, updates);
      console.log(`✅ ${email} attempts reset to 0, status set to "Actif"`);
      
    } else {
      // ÉCHEC : incrémenter les tentatives
      const newValue = currentAttempts + 1;
      
      console.log(`❌ Login failed: ${email} = ${currentAttempts} → ${newValue}`);
      
      const updates: any = {
        failed_login_attempts: newValue,
        updated_at: new Date()
      };
      
      // Vérifier si le nombre max d'erreurs est atteint
      if (newValue >= maxAttempts) {
        console.log(`⚠️ Max attempts reached for ${email} (${newValue}/${maxAttempts})`);
        
        const blockedStatusId = await getStatusIdByLabel('Bloque');
        
        if (blockedStatusId) {
          updates.statuts_user_id = blockedStatusId;
          updates.blocked_at = new Date();
          console.log(`🚫 Account ${email} is now BLOCKED (status ID: ${blockedStatusId})`);
          
          // IMPORTANT: Appeler le backend pour désactiver l'utilisateur dans Firebase
          try {
            await disableFirebaseUser(email);
          } catch (fbError) {
            console.error('Failed to disable Firebase user:', fbError);
          }
        }
      }
      
      await updateDoc(userRef, updates);
    }
    
  } catch (error) {
    console.error('Error logging login attempt:', error);
  }
}

// Fonction pour récupérer les données utilisateur de Firestore
async function getUserDataFromFirestore(email: string): Promise<any> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const userDoc = snapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('Error getting user data from Firestore:', error);
    return null;
  }
}

// Fonction pour désactiver un utilisateur Firebase via l'API backend
async function disableFirebaseUser(email: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/disable-firebase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`Failed to disable Firebase user: ${response.statusText}`);
    }

    console.log(`✅ Firebase user ${email} disabled via API`);
  } catch (error) {
    console.error('Error disabling Firebase user:', error);
    // Ne pas throw pour ne pas bloquer le flux principal
  }
}

/**
 * Vérifie si un compte est bloqué via le backend
 */
export async function checkIfAccountIsBlocked(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/check-blocked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const result = await response.json();
    return result.isBlocked || false;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    return false;
  }
}

// Fonction pour récupérer le nombre max d'essais depuis "regles_gestion"
async function getMaxLoginAttempts(): Promise<number> {
  try {
    const rulesRef = collection(db, 'regles_gestion');
    const q = query(rulesRef, where('libelle', '==', 'Nombre_tentative_connexion'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn('Rule "Nombre_tentative_connexion" not found, using default: 3');
      return 3; // Valeur par défaut
    }
    
    const ruleData = snapshot.docs[0].data();
    const maxAttempts = parseInt(ruleData.valeur);
    
    if (isNaN(maxAttempts) || maxAttempts <= 0) {
      console.warn(`Invalid max attempts value: "${ruleData.valeur}", using default: 3`);
      return 3;
    }
    
    return maxAttempts;
    
  } catch (error) {
    console.error('Error getting max login attempts:', error);
    return 3; // Valeur par défaut en cas d'erreur
  }
}

// Fonction pour trouver l'ID d'un statut par son libellé
async function getStatusIdByLabel(label: string): Promise<number | null> {
  try {
    const statusesRef = collection(db, 'statuts_user');
    const q = query(statusesRef, where('libelle', '==', label));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn(`Status "${label}" not found in statuts_user collection`);
      return null;
    }
    
    const statusData = snapshot.docs[0].data();
    const statusId = statusData.id;
    
    if (typeof statusId !== 'number') {
      console.warn(`Invalid status ID for "${label}":`, statusId);
      return null;
    }
    
    return statusId;
    
  } catch (error) {
    console.error(`Error getting status ID for "${label}":`, error);
    return null;
  }
}

// Fonction utilitaire pour créer les données de test si nécessaire
export async function initializeFirestoreData(): Promise<void> {
  try {
    console.log('🔧 Initializing Firestore data...');
    
    // Vérifier/Créer la règle "Nombre_tentative_connexion"
    await initializeRule('Nombre_tentative_connexion', '3');
    
    // Vérifier/Créer les statuts utilisateur
    await initializeStatus(1, 'Actif');
    await initializeStatus(2, 'Bloque');
    await initializeStatus(3, 'Inactif');
    
    console.log('✅ Firestore data initialized');
    
  } catch (error) {
    console.error('Error initializing Firestore data:', error);
  }
}

async function initializeRule(libelle: string, valeur: string): Promise<void> {
  const rulesRef = collection(db, 'regles_gestion');
  const q = query(rulesRef, where('libelle', '==', libelle));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    // Créer la règle
    const { addDoc } = await import('firebase/firestore');
    await addDoc(rulesRef, {
      libelle,
      valeur,
      updated_at: new Date()
    });
    console.log(`✅ Created rule: ${libelle} = ${valeur}`);
  } else {
    console.log(`✓ Rule "${libelle}" already exists`);
  }
}

async function initializeStatus(id: number, libelle: string): Promise<void> {
  const statusesRef = collection(db, 'statuts_user');
  const q = query(statusesRef, where('libelle', '==', libelle));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    // Créer le statut
    const { addDoc } = await import('firebase/firestore');
    await addDoc(statusesRef, {
      id,
      libelle,
      updated_at: new Date()
    });
    console.log(`✅ Created status: ${libelle} (ID: ${id})`);
  } else {
    console.log(`✓ Status "${libelle}" already exists`);
  }
}

// Fonction pour vérifier si un compte est bloqué
export async function isAccountBlocked(email: string): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return false;
    
    const userData = snapshot.docs[0].data();
    const attempts = userData.failed_login_attempts || 0;
    
    // Récupérer la limite
    const maxAttempts = await getMaxLoginAttempts();
    
    return attempts >= maxAttempts;
    
  } catch (error) {
    console.error('Error checking if account is blocked:', error);
    return false;
  }
}

// Fonction pour réinitialiser manuellement un compte
export async function resetAccount(email: string): Promise<void> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn(`Cannot reset: user ${email} not found`);
      return;
    }
    
    const userRef = doc(db, 'users', snapshot.docs[0].id);
    const activeStatusId = await getStatusIdByLabel('Actif');
    
    const updates: any = {
      failed_login_attempts: 0,
      updated_at: new Date()
    };
    
    if (activeStatusId) {
      updates.statuts_user_id = activeStatusId;
    }
    
    await updateDoc(userRef, updates);
    console.log(`✅ Account ${email} reset to active`);
    
  } catch (error) {
    console.error('Error resetting account:', error);
  }
}

export async function fetchAllSignalementsFromApi(): Promise<any[]> {
  try {
    console.log('[API] Fetching all signalements from:', `${API_BASE_URL}/api/signalements`);
    const response = await fetch(`${API_BASE_URL}/api/signalements`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const result: SignalementApiResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la récupération des signalements');
    }

    return result.data || [];
  } catch (error) {
    console.error('[API] Erreur lors de la récupération des signalements:', error);
    throw error;
  }
}

export async function fetchSignalementById(id: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/signalements/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const result: SignalementApiResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la récupération du signalement');
    }

    return result.data;
  } catch (error) {
    console.error('Erreur lors de la récupération du signalement:', error);
    throw error;
  }
}

export async function fetchSignalementsByUser(userId: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/signalements/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const result: SignalementApiResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la récupération des signalements');
    }

    return result.data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des signalements utilisateur:', error);
    throw error;
  }
}

export async function fetchSignalementsByStatus(status: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/signalements/status/${status}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.statusText}`);
    }

    const result: SignalementApiResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erreur lors de la récupération des signalements');
    }

    return result.data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des signalements par statut:', error);
    throw error;
  }
}
