from pathlib import Path
path = Path('src/views/LoginPage.vue')
text = path.read_text(encoding='utf-8')
start = text.index('    <ion-content :fullscreen="true" class="ion-padding">')
end_content = text.index('    </ion-content>', start) + len('    </ion-content>')
new_block = '''    <ion-content :fullscreen="true" class="ion-padding">
      <div class="auth-background">
        <div class="login-hero glass-card">
          <p class="section-heading">Bienvenue</p>
          <h1>Signalement intelligent</h1>
          <p>
            Soyez le premier à capter la géolocalisation d'un problème et boostez la réactivité de votre collectivité.
          </p>
        </div>

        <div class="login-container">
          <ion-card class="login-card">
            <ion-card-header>
              <ion-card-title>Connexion / Inscription</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-item>
                <ion-label position="floating">Adresse email</ion-label>
                <ion-input v-model="email" type="email" placeholder="votre@email.com"></ion-input>
              </ion-item>
              
              <ion-item>
                <ion-label position="floating">Mot de passe</ion-label>
                <ion-input v-model="password" type="password" placeholder="••••••••"></ion-input>
              </ion-item>

              <div class="button-container">
                <ion-button expand="block" @click="signUp" :disabled="loading">
                  <ion-spinner v-if="loading && action === 'signup'" name="crescent"></ion-spinner>
                  <span v-else>S'inscrire</span>
                </ion-button>
                
                <ion-button expand="block" color="secondary" @click="signIn" :disabled="loading">
                  <ion-spinner v-if="loading && action === 'signin'" name="crescent"></ion-spinner>
                  <span v-else>Se connecter</span>
                </ion-button>

                <ion-button expand="block" color="danger" @click="signOut" :disabled="loading || !user">
                  Se déconnecter
                </ion-button>
              </div>

              <div v-if="message" class="message" :class="messageType">
                <ion-text :color="messageType">{{ message }}</ion-text>
              </div>

              <div v-if="user" class="user-info">
                <ion-text color="success">
                  <h3>Utilisateur connecté:</h3>
                  <p>Email: {{ user.email }}</p>
                  <p>UID: {{ user.uid }}</p>
                </ion-text>
              </div>

              <div class="interface-ideas">
                <h3>Idées pour l'interface</h3>
                <ul>
                  <li>Afficher un aperçu de la carte dès l'ouverture pour inciter au signalement.</li>
                  <li>Régler des badges colorés pour les statuts afin de les lire rapidement.</li>
                  <li>Ajouter un rappel push ou un toast pour suivre les réponses aux alertes.</li>
                </ul>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>
'''
new_text = text[:start] + new_block + text[end_content:]
path.write_text(new_text, encoding='utf-8')
