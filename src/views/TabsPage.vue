<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>
      <!-- Tab bar masqué -->
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonTabs, IonPage, IonRouterOutlet } from '@ionic/vue';
</script>
