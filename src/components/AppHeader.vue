<template>
  <div class="app-header">
    <button class="app-header-btn app-header-btn--active" @click="openFilters">
      <!-- Icône de filtre -->
      <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" fill="currentColor" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="none"></rect>
        <line x1="40" y1="128" x2="216" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
        <circle cx="80" cy="64" r="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></circle>
        <line x1="104" y1="64" x2="216" y2="64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
        <line x1="40" y1="64" x2="56" y2="64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
        <circle cx="176" cy="192" r="24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></circle>
        <line x1="40" y1="192" x2="152" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
        <line x1="200" y1="192" x2="216" y2="192" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
      </svg>
    </button>
    
    <h1 class="app-header-title">! CLIQUEZ POUR UN NOUVEAU SIGNALEMENT !</h1>
    
    <button class="app-header-btn app-header-btn--notification" @click="openNotifications">
      <svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" fill="currentColor" viewBox="0 0 256 256">
        <rect width="256" height="256" fill="none"></rect>
        <line x1="96" y1="224" x2="160" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></line>
        <path d="M56.20305,104A71.899,71.899,0,0,1,128.5484,32.002c39.58967.29432,71.25651,33.20133,71.25651,72.90185V112c0,35.81563,7.49325,56.59893,14.093,67.95814A7.999,7.999,0,0,1,207.01628,192H48.98365A7.99908,7.99908,0,0,1,42.103,179.95641c6.60328-11.35959,14.1-32.1426,14.1-67.95641Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { actionSheetController } from '@ionic/vue';

const emit = defineEmits(['filter-change']);

const openFilters = async () => {
  const actionSheet = await actionSheetController.create({
    header: 'Filtrer les signalements',
    buttons: [
      {
        text: 'Tous mes signalements',
        handler: () => {
          emit('filter-change', 'all');
        }
      },
      {
        text: 'Nouveau',
        handler: () => {
          emit('filter-change', 'nouveau');
        }
      },
      {
        text: 'En cours',
        handler: () => {
          emit('filter-change', 'en_cours');
        }
      },
      {
        text: 'Terminé',
        handler: () => {
          emit('filter-change', 'termine');
        }
      },
      {
        text: 'Annuler',
        role: 'cancel'
      }
    ]
  });

  await actionSheet.present();
};

const openNotifications = () => {
  console.log('Notifications clicked');
};
</script>

<style scoped>
/* Styles are in variables.css */
</style>
