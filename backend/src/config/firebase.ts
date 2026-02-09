import admin from 'firebase-admin';
import { readFileSync } from 'fs';

console.log('🚀 Initializing Firebase Admin SDK...');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Lire directement depuis le même dossier
    const serviceAccount = JSON.parse(
      readFileSync(new URL('./service-account.json', import.meta.url), 'utf8')
    );
    
    console.log('✅ Service account loaded:');
    console.log('   Project:', serviceAccount.project_id);
    console.log('   Account:', serviceAccount.client_email);
    
    // Vérification
    if (serviceAccount.project_id !== 'cloud-web-mobile') {
      console.error('❌ ERROR: Wrong project!');
      console.error('   Expected: cloud-web-mobile');
      console.error('   Got:', serviceAccount.project_id);
      process.exit(1);
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('✅ Firebase Admin SDK initialized');
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    
    if (error.code === 'ENOENT') {
      console.error('   service-account.json not found in src/config/');
    }
    
    process.exit(1);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();

console.log('✅ Firestore and Auth ready');

// Test
db.listCollections()
  .then(cols => console.log(`✅ ${cols.length} collections accessible`))
  .catch(err => {
    console.error('❌ Firestore error:', err.code);
    if (err.code === 16) {
      console.log('⚠️  IAM permissions needed');
    }
  });

export default admin;