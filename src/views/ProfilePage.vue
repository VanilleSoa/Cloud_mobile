<template>
  <ion-page>
    <AppHeader />
    
    <ion-content :fullscreen="true" class="content-with-footer">
      <div class="profile-container">
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Profil</h2>
          </div>
          <div class="section-body">
            <ion-card v-if="user" class="profile-card">
              <ion-card-content>
                <div class="profile-avatar">
                  <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="currentColor" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none"></rect>
                    <circle cx="128" cy="96" r="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="16"></circle>
                    <path d="M30.989,215.99064a112.03731,112.03731,0,0,1,194.02311.002" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
                  </svg>
                </div>
                <div class="profile-info">
                  <h3>{{ user.email }}</h3>
                  <p class="user-id">{{ user.uid }}</p>
                </div>
                
                <ion-button expand="block" color="danger" @click="handleSignOut">
                  Se déconnecter
                </ion-button>
              </ion-card-content>
            </ion-card>
            
            <div v-else class="empty-state">
              <ion-text color="medium">
                <p>Non connecté</p>
              </ion-text>
              <ion-button expand="block" @click="goToLogin">
                Se connecter
              </ion-button>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
    
    <AppFooter />
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonContent,
  IonText,
  IonCard,
  IonCardContent,
  IonButton,
} from '@ionic/vue';
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
import { auth } from '@/Firebase/FirebaseConfig';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';

const router = useRouter();
const user = ref<User | null>(null);

onMounted(() => {
  onAuthStateChanged(auth, (currentUser) => {
    user.value = currentUser;
  });
});

const handleSignOut = async () => {
  try {
    await signOut(auth);
    router.push('/login');
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
  }
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
.content-with-footer {
  --background: var(--c-grey-100);
  padding-bottom: 80px;
}

.profile-container {
  padding: 1rem;
}

.section {
  margin-top: 1rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--c-grey-900);
}

.section-body {
  padding: 0;
}

.profile-card {
  --background: var(--c-grey-000);
  border-radius: 24px;
  box-shadow: 0 5px 20px 0 rgba(150, 132, 254, 0.1), 0 15px 30px 0 rgba(150, 132, 254, 0.05);
}

.profile-avatar {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.profile-avatar svg {
  color: var(--c-purple-500);
}

.profile-info {
  text-align: center;
  margin-bottom: 2rem;
}

.profile-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--c-grey-900);
  margin: 0 0 0.5rem 0;
}

.user-id {
  font-size: 0.75rem;
  color: var(--c-grey-700);
  font-family: monospace;
  word-break: break-all;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.empty-state p {
  font-size: 1rem;
  color: var(--c-grey-700);
}

ion-button {
  --border-radius: 12px;
  font-weight: 600;
  margin-top: 1rem;
}
</style>
