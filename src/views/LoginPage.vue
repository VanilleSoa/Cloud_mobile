<template>
  <ion-page>
    <ion-content :fullscreen=\"true\" class=\"ion-padding\">
      <div class=\"auth-background\">
        <div class=\"login-hero glass-card\">
          <p class=\"section-heading\">Bienvenue</p>
          <h1>Signalement intelligent</h1>
          <p>
            Soyez le premier à capter la géolocalisation d'un problème et boostez la réactivité de votre collectivité.
          </p>
        </div>

        <div class=\"login-container\">
          <ion-card class=\"login-card\">
            <ion-card-content>
              <div class=\"login-split\">
                <div class=\"login-side form-panel\">
                  <p class=\"section-heading\">Connexion</p>
                  <h2>Welcome back</h2>
                  <p class=\"subheading\">Login to your account</p>

                  <ion-item>
                    <ion-label position=\"floating\">Email</ion-label>
                    <ion-input v-model=\"email\" type=\"email\" placeholder=\"m@example.com\"></ion-input>
                  </ion-item>

                  <ion-item>
                    <ion-label position=\"floating\">Password</ion-label>
                    <ion-input v-model=\"password\" type=\"password\" placeholder=\"••••••••\"></ion-input>
                  </ion-item>

                  <div class=\"button-container\">
                    <ion-button expand=\"block\" color=\"primary\" @click=\"signIn\" :disabled=\"loading\">
                      <ion-spinner v-if=\"loading && action === 'signin'\" name=\"crescent\"></ion-spinner>
                      <span v-else>Login</span>
                    </ion-button>
                    <ion-button fill=\"clear\" color=\"medium\" size=\"small\" @click=\"forgotPassword\">
                      Forgot your password?
                    </ion-button>
                  </div>

                  <div v-if=\"message\" class=\"message\" :class=\"messageType\">
                    <ion-text :color=\"messageType\">{{ message }}</ion-text>
                  </div>

                  <div v-if=\"user\" class=\"user-info\">
                    <ion-text color=\"success\">
                      <h3>Utilisateur connecté:</h3>
                      <p>Email: {{ user.email }}</p>
                      <p>UID: {{ user.uid }}</p>
                    </ion-text>
                  </div>

                  <div class=\"signup-link\">
                    <span>Don't have an account?</span>
                    <ion-button expand=\"block\" color=\"secondary\" fill=\"clear\" size=\"small\" @click=\"signUp\" :disabled=\"loading\">
                      Sign up
                    </ion-button>
                  </div>
                </div>

                <div class=\"login-side image-panel\">
                  <div class=\"image-placeholder\">
                    <span>Image</span>
                    <p>Votre dashboard commence ici.</p>
                  </div>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang=\"ts\">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSpinner,
} from '@ionic/vue';
import { auth } from '@/Firebase/FirebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const action = ref('');
const message = ref('');
const messageType = ref('medium');
const user = ref<User | null>(null);

onAuthStateChanged(auth, (currentUser) => {
  user.value = currentUser;
});

const showMessage = (msg: string, type: string) => {
  message.value = msg;
  messageType.value = type;
};

const signUp = async () => {
  if (!email.value || !password.value) {
    showMessage('Veuillez remplir tous les champs', 'danger');
    return;
  }

  loading.value = true;
  action.value = 'signup';
  message.value = '';

  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value);
    showMessage('Compte créé avec succès !', 'success');
    email.value = '';
    password.value = '';
    setTimeout(() => {
      router.replace('/tabs/tab1');
    }, 800);
  } catch (error: any) {
    showMessage(Erreur: , 'danger');
  } finally {
    loading.value = false;
    action.value = '';
  }
};

const signIn = async () => {
  if (!email.value || !password.value) {
    showMessage('Veuillez remplir tous les champs', 'danger');
    return;
  }

  loading.value = true;
  action.value = 'signin';
  message.value = '';

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    showMessage('Connexion réussie !', 'success');
    email.value = '';
    password.value = '';
    setTimeout(() => {
      router.replace('/tabs/tab1');
    }, 800);
  } catch (error: any) {
    showMessage(Erreur: , 'danger');
  } finally {
    loading.value = false;
    action.value = '';
  }
};

const signOut = async () => {
  loading.value = true;
  message.value = '';

  try {
    await firebaseSignOut(auth);
    showMessage('Déconnexion réussie', 'success');
  } catch (error: any) {
    showMessage(Erreur: , 'danger');
  } finally {
    loading.value = false;
  }
};

const forgotPassword = () => {
  showMessage('Fonction oubli du mot de passe à venir.', 'medium');
};
</script>

<style scoped>
.auth-background {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-height: calc(100vh - var(--ion-toolbar-height, 56px));
  padding: 24px 16px 32px;
}

.login-hero {
  width: min(540px, 100%);
  text-align: left;
}

.login-hero h1 {
  margin: 6px 0 6px;
  font-size: 2rem;
}

.login-hero p {
  margin: 0;
  color: rgba(248, 250, 252, 0.8);
}

.login-container {
  width: 100%;
  max-width: 700px;
}

.login-card {
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 24px 60px rgba(2, 6, 12, 0.65);
}

.login-split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.login-side {
  padding: 28px;
}

.form-panel h2 {
  margin: 4px 0;
  font-weight: 600;
}

.subheading {
  margin: 0 0 16px;
  color: rgba(255, 255, 255, 0.8);
}

.button-container {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  padding: 14px;
  border-radius: 12px;
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.user-info {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background-color: rgba(16, 220, 96, 0.1);
}

.signup-link {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.image-panel {
  background: linear-gradient(135deg, rgba(12, 99, 255, 0.6), rgba(54, 209, 220, 0.35));
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-placeholder {
  text-align: center;
  color: #fff;
}

.image-placeholder span {
  font-size: 1.3rem;
  font-weight: 600;
}

.image-placeholder p {
  margin-top: 8px;
}

ion-item {
  margin-bottom: 10px;
}
</style>
