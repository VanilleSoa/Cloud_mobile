<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="login-container">
        <div class="login-card-wrapper">
          <ion-card class="login-card">
            <ion-card-header>
              <ion-card-title class="login-title">Welcome back</ion-card-title>
              <p class="login-subtitle">Login to your account</p>
            </ion-card-header>
            <ion-card-content>
              <div class="input-group">
                <label class="input-label">Email</label>
                <ion-input 
                  v-model="email" 
                  type="email" 
                  placeholder="m@example.com"
                  class="custom-input"
                ></ion-input>
              </div>
              
              <div class="input-group">
                <div class="label-row">
                  <label class="input-label">Password</label>
                  <a href="#" class="forgot-link">Forgot your password?</a>
                </div>
                <ion-input 
                  v-model="password" 
                  type="password" 
                  placeholder="••••••••"
                  class="custom-input"
                ></ion-input>
              </div>

              <ion-button expand="block" @click="signIn" :disabled="loading" class="login-btn">
                <ion-spinner v-if="loading && action === 'signin'" name="crescent"></ion-spinner>
                <span v-else>Login</span>
              </ion-button>

              <div class="divider">
                <span>Or continue with</span>
              </div>

              <div class="social-buttons">
                <button class="social-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                </button>
                <button class="social-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </button>
                <button class="social-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
                  </svg>
                </button>
              </div>

              <p class="signup-text">Contactez le manager pour créer un compte.</p>

              <div v-if="message" class="message" :class="messageType">
                <ion-text :color="messageType">{{ message }}</ion-text>
              </div>

              <ion-button v-if="user" expand="block" color="danger" @click="signOut" :disabled="loading" fill="clear" size="small" style="margin-top: 1rem;">
                Se déconnecter
              </ion-button>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonSpinner
} from '@ionic/vue';
import { auth } from '@/Firebase/FirebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { logLoginAttempt } from '@/services/api';

const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const action = ref('');
const message = ref('');
const messageType = ref('');
const user = ref<User | null>(null);

// Écouter les changements d'état d'authentification
onAuthStateChanged(auth, (currentUser) => {
  user.value = currentUser;
});

const signUp = async () => {
  if (!email.value || !password.value) {
    showMessage('Veuillez remplir tous les champs', 'danger');
    return;
  }
  
  loading.value = true;
  action.value = 'signup';
  message.value = '';
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
    showMessage(`Compte créé avec succès! Redirection...`, 'success');
    email.value = '';
    password.value = '';
    // Redirection vers les tabs après l'inscription
    setTimeout(() => {
      router.replace('/tabs/tab1');
    }, 1000);
  } catch (error: any) {
    showMessage(`Erreur: ${error.message}`, 'danger');
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
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    
    // Log successful login attempt
    await logLoginAttempt(email.value, true);
    
    showMessage(`Connexion réussie! Redirection...`, 'success');
    email.value = '';
    password.value = '';
    // Redirection vers les tabs après la connexion
    setTimeout(() => {
      router.replace('/tabs/tab1');
    }, 1000);
  } catch (error: any) {
    // Log failed login attempt
    await logLoginAttempt(email.value, false);
    
    showMessage(`Erreur: ${error.message}`, 'danger');
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
    showMessage(`Erreur: ${error.message}`, 'danger');
  } finally {
    loading.value = false;
  }
};

const showMessage = (msg: string, type: string) => {
  message.value = msg;
  messageType.value = type;
};
</script>

<style scoped>
ion-content {
  --background: #f5f5f5;
}

.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
  background: #f5f5f5;
}

.login-card-wrapper {
  width: 100%;
  max-width: 420px;
}

.login-card {
  --background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin: 0;
  border: 1px solid #e8e8e8;
}

.login-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #000000;
  text-align: left;
  margin-bottom: 0.25rem;
  letter-spacing: -0.02em;
}

.login-subtitle {
  text-align: left;
  color: #7d7d80;
  font-size: 0.875rem;
  margin: 0 0 1.5rem 0;
  font-weight: 400;
}

.input-group {
  margin-bottom: 1.25rem;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #000000;
  margin-bottom: 0.5rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.forgot-link {
  font-size: 0.875rem;
  color: #7d7d80;
  text-decoration: none;
  font-weight: 400;
}

.forgot-link:hover {
  color: #000000;
  text-decoration: underline;
}

.custom-input {
  --background: #ffffff;
  --color: #000000;
  --placeholder-color: #999999;
  --placeholder-opacity: 1;
  --padding-start: 0.875rem;
  --padding-end: 0.875rem;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 0.9375rem;
  height: 44px;
}

.custom-input::part(native) {
  padding: 0.625rem 0.875rem;
}

.login-btn {
  --background: #ffc107;
  --background-activated: #f0b000;
  --background-hover: #f0b000;
  --color: #000000;
  --border-radius: 8px;
  font-weight: 600;
  height: 44px;
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
  text-transform: none;
  font-size: 0.9375rem;
}

.divider {
  position: relative;
  text-align: center;
  margin: 1.5rem 0;
}

.divider::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background: #e8e8e8;
}

.divider span {
  position: relative;
  background: #ffffff;
  padding: 0 1rem;
  font-size: 0.875rem;
  color: #7d7d80;
}

.social-buttons {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.social-btn {
  flex: 1;
  height: 44px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #000000;
}

.social-btn:hover {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

.social-btn:active {
  transform: scale(0.98);
}

.signup-text {
  text-align: center;
  font-size: 0.875rem;
  color: #7d7d80;
  margin: 0;
  line-height: 1.5;
}

.message {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-size: 0.875rem;
}

.message.success {
  background-color: rgba(16, 220, 96, 0.1);
}

.message.danger {
  background-color: rgba(235, 68, 90, 0.1);
}

.user-info {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background-color: var(--c-grey-100);
  text-align: center;
}

.user-info p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: var(--c-grey-700);
}

ion-card-header {
  padding-bottom: 0.5rem;
}
</style>
