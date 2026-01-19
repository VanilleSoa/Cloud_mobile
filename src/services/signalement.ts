import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "@/Firebase/FirebaseConfig";
import type { SignalementPayload, SignalementRecord } from "@/types/signalement";

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
  form: SignalementFormInput
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
  payload: SignalementPayload
): Promise<string> => {
  if (!auth.currentUser) {
    throw new Error("Authentification requise.");
  }
  const docRef = await addDoc(collection(db, "signalements"), {
    ...payload,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
};

export const fetchMySignalements = async (
  userId: string
): Promise<SignalementRecord[]> => {
  const snapshot = await getDocs(
    query(collection(db, "signalements"), where("userId", "==", userId))
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
