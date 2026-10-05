/* Reúne só as partes do Firebase que o ChatMil usa.
   O tools/build.py empacota este arquivo em www/vendor/firebase.js (variável global FB). */
export { initializeApp } from "firebase/app";
export {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification,
  sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  deleteUser, reload, updateProfile, connectAuthEmulator
} from "firebase/auth";
export {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager, memoryLocalCache,
  doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot,
  query, where, orderBy, limit, limitToLast, startAt, endAt, writeBatch, runTransaction,
  serverTimestamp, arrayUnion, arrayRemove, increment, getCountFromServer, Timestamp, connectFirestoreEmulator
} from "firebase/firestore";
