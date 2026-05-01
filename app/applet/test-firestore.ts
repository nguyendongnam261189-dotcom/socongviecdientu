import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, or, where } from "firebase/firestore";

const app = initializeApp({ projectId: "demo-test" });
const db = getFirestore(app);

const q = query(
  collection(db, "tasks"),
  or(
    where("createdAt", ">=", "2024-01-01"),
    where("status", "in", ["todo", "doing"])
  )
);
console.log("Success building query");
