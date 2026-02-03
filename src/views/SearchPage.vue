<template>
  <ion-page>
    <AppHeader />
    
    <ion-content :fullscreen="true" class="content-with-footer">
      <div class="search-container">
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">Recherche</h2>
          </div>
          <div class="section-body">
            <ion-searchbar 
              placeholder="Rechercher un signalement..." 
              :animated="true"
              class="custom-searchbar"
            ></ion-searchbar>
            
            <div class="empty-state">
              <ion-text color="medium">
                <p>Fonctionnalité de recherche à venir</p>
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
  IonSearchbar,
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

.search-container {
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

.custom-searchbar {
  --background: var(--c-grey-000);
  --border-radius: 12px;
  --box-shadow: 0 5px 15px rgba(150, 132, 254, 0.15);
  padding: 0;
}

.empty-state {
  margin-top: 3rem;
  text-align: center;
  padding: 2rem;
}

.empty-state p {
  font-size: 1rem;
  color: var(--c-grey-700);
}
</style>
