import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Task, Comment, Document, TabType } from "../types";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  or,
  getDocs,
  getDoc,
} from "firebase/firestore";

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  toast: { id: string; message: string; onUndo?: () => void } | null;
  showToast: (message: string, onUndo?: () => void) => void;
  hideToast: () => void;
  authReady: boolean;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  grades: string[];
  setGrades: React.Dispatch<React.SetStateAction<string[]>>;
  documentCategories: string[];
  setDocumentCategories: React.Dispatch<React.SetStateAction<string[]>>;
  gasUrl: string;
  setGasUrl: (url: string) => void;

  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("tasks");

  const [gasUrl, setGasUrlState] = useState<string>(localStorage.getItem("gasUrl") || "");

  const setGasUrl = (url: string) => {
    setGasUrlState(url);
    localStorage.setItem("gasUrl", url);
  };

  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
        const qs = await getDocs(q);

        if (!qs.empty) {
          const appUser = { id: qs.docs[0].id, ...qs.docs[0].data() } as User;
          setCurrentUser(appUser);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const showToast = (message: string) => {
    const id = Math.random().toString();
    console.log("Toast:", message);
  };

  const hideToast = () => {};

  // 🔥 FIX CHÍNH Ở ĐÂY
  const addTask = async (taskData: Omit<Task, "id" | "createdAt">) => {
    const newId = doc(collection(db, "tasks")).id;

    const newTask: Task = {
      ...taskData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    if (taskData.category === "announcement" || taskData.category === "poll") {
      newTask.readBy = [];
    }
    if (taskData.category === "task") {
      newTask.submissions = [];
    }

    // Optimistic UI
    setTasks((prev) => [newTask, ...prev]);

    try {
      // 🔥 QUAN TRỌNG: await thật sự
      await setDoc(doc(db, "tasks", newId), newTask);

      // 🔥 XỬ LÝ DOCUMENT (giữ nguyên logic)
      if (
        taskData.category === "announcement" &&
        taskData.attachments &&
        taskData.attachments.length > 0
      ) {
        for (const att of taskData.attachments) {
          const docId = doc(collection(db, "documents")).id;

          const newDocData: Document = {
            id: docId,
            title: att.title || taskData.title,
            driveUrl: att.url,
            createdAt: new Date().toISOString(),
            createdBy: taskData.createdBy,
          } as Document;

          await setDoc(doc(db, "documents", docId), newDocData);
        }
      }

    } catch (err) {
      console.error("Error adding task: ", err);

      // rollback nếu lỗi
      setTasks((prev) => prev.filter((t) => t.id !== newId));

      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        logout: handleLogout,
        users,
        setUsers,
        tasks,
        setTasks,
        comments,
        setComments,
        documents,
        setDocuments,
        activeTab,
        setActiveTab,
        toast: null,
        showToast,
        hideToast,
        authReady,
        departments: [],
        setDepartments: () => {},
        grades: [],
        setGrades: () => {},
        documentCategories: [],
        setDocumentCategories: () => {},
        gasUrl,
        setGasUrl,
        addTask,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
