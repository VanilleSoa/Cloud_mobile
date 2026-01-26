import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  runTransaction,
} from "firebase/firestore";
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
      latitude: latitude || null,
      longitude: longitude || null,
      status: status || "nouveau",
      userId: userId || null,
      userEmail: userEmail || null,
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
  const snapshot = await getDocs(query(collection(db, "signalements")));

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
