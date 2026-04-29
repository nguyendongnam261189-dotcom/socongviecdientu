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
  addDoc,
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

  // 🔥 SỬA DUY NHẤT 1 DÒNG
  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>;

  updateTaskStatus: (taskId: string, status: Task["status"]) => void;
  deleteTask: (taskId: string) => void;
  markTaskRead: (taskId: string) => void;
  toggleTaskUrgent: (taskId: string) => void;
  toggleCommentsLock: (taskId: string) => void;
  votePoll: (taskId: string, optionId: string | null) => void;
  toggleTaskLock: (taskId: string) => void;
  submitReport: (
    taskId: string,
    content: string,
    url?: string,
    data?: Record<string, string | number>,
  ) => void;
  addComment: (
    taskId: string,
    content: string,
    parentId?: string | null,
  ) => void;

  addUser: (user: Partial<User>) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("tasks");

  const [departments, setDepartments] = useState<string[]>([
    "Toán","Văn","Ngoại Ngữ","Lý - Hóa - Sinh","Sử - Địa - GDCD","Thể dục - QP","BGH"
  ]);

  const [grades, setGrades] = useState<string[]>([
    "Khối 10","Khối 11","Khối 12","Toàn trường"
  ]);

  const [documentCategories, setDocumentCategories] = useState<string[]>([
    "Công văn","Ảnh hoạt động","Thời khóa biểu","Kế hoạch giảng dạy","Khác"
  ]);

  const [gasUrl, setGasUrlState] = useState<string>(localStorage.getItem("gasUrl") || "");

  const setGasUrl = (url: string) => {
    setGasUrlState(url);
    localStorage.setItem("gasUrl", url);
  };

  const [toast, setToast] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
        const qs = await getDocs(q);
        if (!qs.empty) {
          setCurrentUser({ id: qs.docs[0].id, ...qs.docs[0].data() } as User);
        }
      } else setCurrentUser(null);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  const showToast = (message: string) => console.log(message);
  const hideToast = () => {};

  const addUser = (userData: Partial<User>) => {
    const newId = doc(collection(db, "users")).id;
    const newUser: User = { ...userData, id: newId } as User;
    setUsers(prev => [...prev, newUser]);
    setDoc(doc(db, "users", newId), newUser);
    return newUser;
  };

  // 🔥 SỬA DUY NHẤT HÀM addTask
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

    setTasks(prev => [newTask, ...prev]);

    try {
      await setDoc(doc(db, "tasks", newId), newTask);

      if (taskData.category === "announcement" && taskData.attachments?.length) {
        for (const att of taskData.attachments) {
          const docId = doc(collection(db, "documents")).id;
          await setDoc(doc(db, "documents", docId), {
            id: docId,
            title: att.title || taskData.title,
            driveUrl: att.url,
            createdAt: new Date().toISOString(),
            createdBy: taskData.createdBy,
          });
        }
      }

    } catch (err) {
      console.error(err);
      setTasks(prev => prev.filter(t => t.id !== newId));
      throw err;
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,setCurrentUser,logout:handleLogout,
      users,setUsers,tasks,setTasks,comments,setComments,
      documents,setDocuments,departments,setDepartments,
      grades,setGrades,documentCategories,setDocumentCategories,
      gasUrl,setGasUrl,activeTab,setActiveTab,
      toast,showToast,hideToast,authReady,
      addUser,updateUser:()=>{},deleteUser:()=>{},
      addTask,
      updateTaskStatus:()=>{},deleteTask:()=>{},
      markTaskRead:()=>{},votePoll:()=>{},
      toggleTaskLock:()=>{},toggleTaskUrgent:()=>{},
      toggleCommentsLock:()=>{},submitReport:()=>{},
      addComment:()=>{}
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
