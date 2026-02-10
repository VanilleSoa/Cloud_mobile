import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  runTransaction,
  onSnapshot,
  Query,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";

// Mapping pour les types de signalement (format web)
const typeSignalementMap: Record<number, string> = {
  1: 'Nid de poule',
  2: 'Fuite / eau',
  3: 'Abîmé',
  4: 'Accident',
  5: 'Construction',
  6: 'Électricité',
  7: 'Déchet',
  8: 'Alerte',
  9: 'Autre',
};

// Mapping pour les statuts (format web)
const statutsMap: Record<number, string> = {
  1: 'nouveau',
  2: 'en_cours',
  3: 'termine',
};

// Cache pour les points
let pointsCache: Record<number, { latitude: number; longitude: number }> | null = null;

async function loadPointsCache(): Promise<Record<number, { latitude: number; longitude: number }>> {
  if (pointsCache) return pointsCache;
  pointsCache = {};
  try {
    const pointsSnapshot = await getDocs(query(collection(db, "points")));
    pointsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.id && data.latitude !== undefined && data.longitude !== undefined) {
        pointsCache![data.id] = { latitude: data.latitude, longitude: data.longitude };
      }
    });
    console.log('[loadPointsCache] Points chargés:', Object.keys(pointsCache).length, '- IDs disponibles:', Object.keys(pointsCache).join(', '));
  } catch (e) {
    console.warn('[loadPointsCache] Collection points non trouvée');
  }
  return pointsCache;
}

// Fonction pour normaliser un document (supporte format web et mobile)
function normalizeSignalement(docId: string, data: DocumentData, pointsMap: Record<number, { latitude: number; longitude: number }>): SignalementRecord {
  let title = data.title;
  let status = data.status;
  let latitude = data.latitude;
  let longitude = data.longitude;
  
  // Format web : convertir les IDs en valeurs (priorité au titre existant)
  if (!title && data.type_signalement_id) {
    const mappedTitle = typeSignalementMap[data.type_signalement_id];
    title = mappedTitle || `Type ${data.type_signalement_id}`;
    console.log('[normalizeSignalement] Conversion type_signalement_id:', data.type_signalement_id, '→', title);
  }
  if (!status && data.statuts_id) {
    status = statutsMap[data.statuts_id] || 'nouveau';
  }
  if ((latitude === undefined || longitude === undefined) && data.point_id) {
    const point = pointsMap[data.point_id];
    if (point) {
      latitude = point.latitude;
      longitude = point.longitude;
    } else {
      console.warn('[normalizeSignalement] Point non trouvé pour point_id:', data.point_id, '- Signalement:', docId);
    }
  }
  
  // Gérer le createdAt
  let createdAt = null;
  if (data.createdAt?.toDate) {
    createdAt = data.createdAt.toDate();
  } else if (data.createdAt?.seconds) {
    createdAt = new Date(data.createdAt.seconds * 1000);
  } else if (data.date) {
    createdAt = new Date(data.date);
  }
  
  return {
    id: docId,
    title,
    description: data.description,
    status,
    latitude,
    longitude,
    photos: data.photos || [],
    budget: data.budget,
    surfaceM2: data.surfaceM2 ?? data.surface,
    userId: data.userId ?? (data.user_id ? String(data.user_id) : null),
    userEmail: data.userEmail,
    createdAt,
  } as SignalementRecord;
}

// Écouteur temps réel pour les signalements
export function listenMySignalementsStatus(_userId: string, onChange: (signalements: SignalementRecord[], changes: {id: string, oldStatus: string, newStatus: string}[]) => void) {
  const lastStatuses: Record<string, string> = {};
  let initialized = false;
  let pointsMap: Record<number, { latitude: number; longitude: number }> = {};
  
  // Charger les points d'abord
  loadPointsCache().then((p) => { pointsMap = p; });
  
  const q = query(collection(db, "signalements"));
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const signalements: SignalementRecord[] = snapshot.docs
      .map((doc) => normalizeSignalement(doc.id, doc.data(), pointsMap))
      .filter((s) => s.title); // Garder seulement les docs avec titre
    
    const changes: {id: string, oldStatus: string, newStatus: string}[] = [];
    for (const s of signalements) {
      if (initialized && lastStatuses[s.id] && lastStatuses[s.id] !== s.status) {
        changes.push({id: s.id, oldStatus: lastStatuses[s.id], newStatus: s.status});
        console.log('[listenMySignalementsStatus] Changement détecté:', s.id, lastStatuses[s.id], '->', s.status);
      }
      lastStatuses[s.id] = s.status;
    }
    initialized = true;
    console.log('[listenMySignalementsStatus] Signalements:', signalements.length, 'Changes:', changes.length);
    onChange(signalements, changes);
  });
}
import { auth, db } from "@/Firebase/FirebaseConfig";

import type {
  SignalementPayload,
  SignalementRecord,
} from "@/types/signalement";

export type SignalementFormInput = {
  title: string;
  description: string;
  surfaceM2: string;
  budget: string;
  latitude: string;
  longitude: string;
  photos?: string[]; // Photos en base64
};

const parseNumberOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export const prepareSignalementPayload = (
  form: SignalementFormInput,
): SignalementPayload => {
  const currentUser = auth.currentUser;

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    surfaceM2: parseNumberOrNull(form.surfaceM2),
    budget: parseNumberOrNull(form.budget),
    latitude: parseNumberOrNull(form.latitude),
    longitude: parseNumberOrNull(form.longitude),
    status: "nouveau",
    userId: currentUser?.uid ?? null,
    userEmail: currentUser?.email ?? null,
    photos: form.photos || [],
  };
};

export const submitSignalement = async (
  payload: SignalementPayload,
): Promise<string> => {
  if (!auth.currentUser) {
    throw new Error("Authentification requise.");
  }
  const {
    title,
    description,
    surfaceM2,
    budget,
    latitude,
    longitude,
    status,
    userId,
    userEmail,
    photos,
  } = payload;

  // Validation minimale
  if (!title || !description) {
    throw new Error("Titre et description requis");
  }
  try {
    // Générer un ID auto-incrémenté avec transaction atomique
    const newId = await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, "counters", "signalements");
      const counterDoc = await transaction.get(counterRef);
      
      let nextId = 1;
      if (counterDoc.exists()) {
        nextId = (counterDoc.data().lastId || 0) + 1;
      }
      
      // Mettre à jour le compteur
      transaction.set(counterRef, { lastId: nextId }, { merge: true });
      
      return nextId;
    });

    // Créer le document dans Firestore avec l'ID numérique
    const docRef = await addDoc(collection(db,"signalements"),{
      id: newId,
      title,
      description,
      surfaceM2,
      budget,
      latitude: latitude || null,
      longitude: longitude || null,
      status: status || "nouveau",
      userId: userId || null,
      userEmail: userEmail || null,
      photos: photos || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id || "unknown";
  } catch (error) {
    console.error(
      "Erreur lors de la création du signalement:",
      JSON.stringify(error),
    );
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Erreur lors de la création du signalement: ${String(error)}`,
    );
  }
  // Use the API backend instead of direct Firestore write
  /* const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const fullUrl = `${apiUrl}/api/signalements`;
  
  console.log('[Signalement] API URL configurée:', apiUrl);
  console.log('[Signalement] URL complète:', fullUrl);
  console.log('[Signalement] Payload:', JSON.stringify(payload, null, 2));
  
  try {
    console.log('[Signalement] Début de la requête fetch...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    console.log('[Signalement] Response status:', response.status);
    console.log('[Signalement] Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Signalement] Response error:', errorText);
      throw new Error(`Erreur serveur (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    console.log('[Signalement] Success response:', data);
    return data.id || data.documentId || 'unknown';
  } catch (error: any) {
    console.error('[Signalement] Erreur complète:', error);
    console.error('[Signalement] Type erreur:', error?.name);
    console.error('[Signalement] Message:', error?.message);
    
    // Messages d'erreur détaillés selon le type
    if (error?.name === 'AbortError') {
      throw new Error(`Timeout: Le serveur ${apiUrl} ne répond pas après 15s. Vérifiez que le backend tourne et que l'IP est correcte.`);
    }
    
    if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
      throw new Error(`Erreur réseau: Impossible de joindre ${apiUrl}. Vérifiez: 1) Le serveur backend tourne 2) Votre téléphone est sur le même WiFi 3) L'IP ${apiUrl} est accessible`);
    }
    
    if (error?.message?.includes('CORS')) {
      throw new Error(`Erreur CORS: Le serveur ${apiUrl} bloque les requêtes. Vérifiez la config CORS du backend.`);
    }
    
    throw new Error(`${error?.message || 'Erreur inconnue'} (URL: ${fullUrl})`);
  } */
};

export const fetchMySignalements = async (
  userId: string,
): Promise<SignalementRecord[]> => {
  const snapshot = await getDocs(
    query(collection(db, "signalements"), where("userId", "==", userId)),
  );

  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as SignalementPayload & {
        createdAt?: { toDate?: () => Date };
      };

      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ?? null,
      };
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeB - timeA;
    });
};

export const fetchAllSignalements = async (): Promise<SignalementRecord[]> => {
  console.log('[fetchAllSignalements] Démarrage récupération...');
  
  // Charger le cache des points
  const pointsMap = await loadPointsCache();
  
  const snapshot = await getDocs(query(collection(db, "signalements")));
  console.log('[fetchAllSignalements] Documents trouvés:', snapshot.docs.length);
  
  const results = snapshot.docs
    .map((doc) => {
      const signalement = normalizeSignalement(doc.id, doc.data(), pointsMap);
      console.log('[fetchAllSignalements] Normalisé:', doc.id, 'title:', signalement.title, 'status:', signalement.status, 'lat:', signalement.latitude, 'lng:', signalement.longitude);
      return signalement;
    })
    .filter((s) => {
      const isValid = s.title;
      if (!isValid) {
        console.warn('[fetchAllSignalements] Document ignoré (sans titre):', s.id);
      }
      return isValid;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? a.createdAt.getTime() : 0;
      const timeB = b.createdAt ? b.createdAt.getTime() : 0;
      return timeB - timeA;
    });
  
  console.log('[fetchAllSignalements] Total valides retournés:', results.length);
  return results;
};
