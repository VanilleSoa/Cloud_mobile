import { Router, Request, Response } from "express";
import { db } from "../config/firebase.js";

const router = Router();
const MAX_ATTEMPTS = 3;

async function resolveStatutsUserId(libelle: string): Promise<number | null> {
  const snap = await db
    .collection("statuts_user")
    .where("libelle", "==", libelle)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return typeof data.id === "number" ? data.id : null;
}

router.post("/failed-attempt", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email required" });
    }

    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (snap.empty) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const docRef = snap.docs[0].ref;
    const bloqueId = await resolveStatutsUserId("Bloque");

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      const data = doc.data() || {};
      const attempts = (data.failed_login_attempts || 0) + 1;

      const updates: any = {
        failed_login_attempts: attempts,
        updated_at: new Date(),
      };

      if (attempts >= MAX_ATTEMPTS && bloqueId) {
        updates.statuts_user_id = bloqueId;
      }

      tx.update(docRef, updates);
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("failed-attempt error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/login-success", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email required" });
    }

    const snap = await db.collection("users").where("email", "==", email).limit(1).get();
    if (snap.empty) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const docRef = snap.docs[0].ref;
    const actifId = await resolveStatutsUserId("Actif");

    const updates: any = {
      failed_login_attempts: 0,
      updated_at: new Date(),
    };
    if (actifId) {
      updates.statuts_user_id = actifId;
    }

    await docRef.update(updates);

    return res.json({ success: true });
  } catch (err) {
    console.error("login-success error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;