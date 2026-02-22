import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCKxGaR4bomPyr-60xe2uenG2eAN5M8kYk",
  authDomain: "logistria-6f4ed.firebaseapp.com",
  projectId: "logistria-6f4ed",
  storageBucket: "logistria-6f4ed.firebasestorage.app",
  messagingSenderId: "739824851928",
  appId: "1:739824851928:web:3d68783e51716ab99bf0ad",
  measurementId: "G-4W1P8FW9KB"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native AsyncStorage to suppress memory warning
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);