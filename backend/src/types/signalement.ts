export type SignalementStatus = "nouveau" | "en_cours" | "termine";

export type Signalement = {
  id: string;
  title: string;
  description: string;
  surfaceM2: number | null;
  budget: number | null;
  latitude: number | null;
  longitude: number | null;
  status: SignalementStatus;
  userId: string | null;
  userEmail: string | null;
  photos?: string[]; // URLs ou base64 des photos
  createdAt: Date | null;
  updatedAt?: Date | null;
};

export type SignalementApiResponse = {
  success: boolean;
  data?: Signalement | Signalement[];
  error?: string;
  message?: string;
};
