import { query, collection, or, where, getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const app = initializeApp({ projectId: "demo-test" });
const db = getFirestore(app);

try {
  const q = query(
    collection(db, "tasks"),
    or(
      where("assignedTo", "array-contains", "user1"),
      where("targetRoles", "array-contains", "admin"),
      where("targetDepartments", "array-contains", "dep"),
      where("targetGrades", "array-contains", "gra")
    )
  );
  console.log("SUCCESS");
} catch(e) {
  console.log("ERROR:", e.message);
}
