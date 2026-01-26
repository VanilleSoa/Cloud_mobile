<template>
  <ion-page>
    <AppHeader />
    
    <ion-content :fullscreen="true" class="content-with-footer">
      <div class="cart-container">
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Panier</h2>
          </div>
          <div class="section-body">
            <div class="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" fill="currentColor" viewBox="0 0 256 256">
                <rect width="256" height="256" fill="none"></rect>
                <circle cx="80" cy="216" r="16"></circle>
                <circle cx="184" cy="216" r="16"></circle>
                <path d="M42.28575,72H221.71429l-26.39873,92.39554A16,16,0,0,1,179.93118,176H84.06882a16,16,0,0,1-15.38438-11.60446L32.51492,37.80223A8,8,0,0,0,24.82273,32H8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
              </svg>
              <ion-text color="medium">
                <p>Votre panier est vide</p>
                <p class="subtitle">Fonctionnalité à venir</p>
              </ion-text>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
    
    <AppFooter />
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonText,
} from '@ionic/vue';
import AppHeader from '@/components/AppHeader.vue';
import AppFooter from '@/components/AppFooter.vue';
</script>

<style scoped>
.content-with-footer {
  --background: var(--c-grey-100);
  padding-bottom: 80px;
}

.cart-container {
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

.empty-state {
  margin-top: 3rem;
  text-align: center;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-state svg {
  color: var(--c-purple-300);
  opacity: 0.5;
}

.empty-state p {
  font-size: 1rem;
  color: var(--c-grey-700);
  margin: 0.25rem 0;
}

.empty-state .subtitle {
  font-size: 0.875rem;
  color: var(--c-grey-500);
}
</style>
