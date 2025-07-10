// auth.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { ref, set } from "firebase/database";

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    const userRef = ref(db, "users/" + uid);

    set(userRef, {
      name: user.displayName || "No Name",
      email: user.email,
      createdAt: new Date().toISOString()
    }).then(() => {
      console.log("User data saved successfully");
    }).catch((error) => {
      console.error("Error saving data:", error);
    });
  }
});
