import admin from 'firebase-admin';
import { ENV } from './env.js';

let firebaseApp: admin.app.App | null = null;

export function initFirebase(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  if (admin.apps.length > 0) {
    firebaseApp = admin.apps[0]!;
    return firebaseApp;
  }

  if (ENV.FIREBASE_PROJECT_ID && ENV.FIREBASE_CLIENT_EMAIL && ENV.FIREBASE_PRIVATE_KEY) {
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: ENV.FIREBASE_PROJECT_ID,
          clientEmail: ENV.FIREBASE_CLIENT_EMAIL,
          privateKey: ENV.FIREBASE_PRIVATE_KEY,
        }),
      });
      console.log('🔥 Firebase Admin initialized with service account.');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
    }
  } else if (ENV.FIREBASE_PROJECT_ID) {
    try {
      firebaseApp = admin.initializeApp({
        projectId: ENV.FIREBASE_PROJECT_ID,
      });
      console.log(`🔥 Firebase Admin initialized with default projectId: ${ENV.FIREBASE_PROJECT_ID}`);
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin with projectId:', error);
    }
  } else {
    console.warn('⚠️ Firebase Admin credentials not set in .env. ID token verification will run in development mode.');
  }

  return firebaseApp;
}

export async function verifyFirebaseIdToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  const app = initFirebase();

  if (app) {
    try {
      const decoded = await admin.auth(app).verifyIdToken(token);
      return decoded;
    } catch (error) {
      console.error('Firebase ID token verification failed:', error);
      return null;
    }
  }

  // Development mode fallback when .env is not yet populated
  if (ENV.NODE_ENV === 'development' || !ENV.FIREBASE_PROJECT_ID) {
    try {
      // Decode base64 JWT payload if possible
      const parts = token.split('.');
      if (parts.length === 3 && parts[1]) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        const parsed = JSON.parse(payloadStr);
        if (parsed.user_id || parsed.sub || parsed.uid) {
          return {
            uid: parsed.user_id || parsed.sub || parsed.uid,
            email: parsed.email || `${parsed.sub || 'user'}@chaton.dev`,
            name: parsed.name || parsed.display_name || 'Chaton User',
            picture: parsed.picture || parsed.photo_url || null,
            auth_time: Math.floor(Date.now() / 1000),
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            aud: 'dev-chaton',
            iss: 'https://securetoken.google.com/dev-chaton',
            sub: parsed.user_id || parsed.sub || parsed.uid,
            firebase: { identities: {}, sign_in_provider: 'google.com' },
          } as admin.auth.DecodedIdToken;
        }
      }
    } catch (e) {
      console.warn('Development JWT token parse warning:', e);
    }
  }

  return null;
}
