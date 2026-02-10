import { collection, getDocs } from "firebase/firestore";
import { db } from "@/Firebase/FirebaseConfig";

export type TypeSignalement = {
  id: string;
  libelle: string;
};

/**
 * Récupérer tous les types de signalement depuis Firestore
 */
export const fetchTypesSignalement = async (): Promise<TypeSignalement[]> => {
  try {
    console.log('[TypeSignalement] Chargement des types...');
    const snapshot = await getDocs(collection(db, "type_signalements"));
    const types: TypeSignalement[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('[TypeSignalement] Document trouvé:', doc.id, data);
      types.push({
        id: doc.id,
        libelle: data.libelle || "",
      });
    });

    // Trier par libellé alphabétique
    types.sort((a, b) => a.libelle.localeCompare(b.libelle));

    console.log('[TypeSignalement] Types chargés:', types.length, types);
    return types;
  } catch (error) {
    console.error("Erreur lors de la récupération des types de signalement:", error);
    throw new Error("Impossible de charger les types de signalement");
  }
};
