import React, { createContext, useContext, useState, useEffect } from "react";
import { User, Task, Comment, Document, TabType, UserTaskStatus } from "../types";
import { auth, db, messaging } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getToken, onMessage } from "firebase/messaging";
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
  activeWeeksView: number;
  setActiveWeeksView: (weeks: number) => void;
  // Actions
  addUser: (user: Partial<User>) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  editTask: (taskId: string, updates: Partial<Task>, notifyAgain: boolean) => void;
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
    status?: import("../types").UserTaskStatus
  ) => void;
  addComment: (
    taskId: string,
    content: string,
    parentId?: string | null,
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("tasks");
  const [departments, setDepartments] = useState<string[]>([
    "Toán",
    "Văn",
    "Ngoại Ngữ",
    "Lý - Hóa - Sinh",
    "Sử - Địa - GDCD",
    "Thể dục - QP",
    "BGH",
    "Khác",
  ]);
  const [grades, setGrades] = useState<string[]>([
    "Khối 10",
    "Khối 11",
    "Khối 12",
    "Toàn trường",
  ]);
  const [documentCategories, setDocumentCategories] = useState<string[]>([
    "Công văn",
    "Ảnh hoạt động",
    "Thời khóa biểu",
    "Kế hoạch giảng dạy",
    "Khác",
  ]);
  const [gasUrl, setGasUrlState] = useState<string>(
    localStorage.getItem("gasUrl") || "",
  );
  const [activeWeeksView, setActiveWeeksView] = useState(2);
  const [toast, setToast] = useState<{
    id: string;
    message: string;
    onUndo?: () => void;
  } | null>(null);

  const setGasUrl = (url: string) => {
    setGasUrlState(url);
    localStorage.setItem("gasUrl", url);
    if (authReady) {
       setDoc(doc(db, "settings", "system"), { gasUrl: url }, { merge: true });
    }
  };

  const updateActiveWeeksView = (weeks: number) => {
    setActiveWeeksView(weeks);
    if (authReady) {
      setDoc(doc(db, "settings", "general"), { activeWeeksView: weeks }, { merge: true });
    }
  }

  const [authReady, setAuthReady] = useState(false);

  // Firestore listeners
  useEffect(() => {
    // If not authenticated in Firebase at all, do not listen
    if (!auth.currentUser && !currentUser) {
       return;
    }

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, "settings", "system"),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.departments) setDepartments(data.departments);
            if (data.grades) setGrades(data.grades);
            if (data.documentCategories) setDocumentCategories(data.documentCategories);
            if (data.gasUrl) setGasUrlState(data.gasUrl);
          } else {
            // First time, create it
            if (currentUser?.role === 'admin') {
               setDoc(doc(db, "settings", "system"), {
                 departments: [
                    "Toán",
                    "Văn",
                    "Ngoại Ngữ",
                    "Lý - Hóa - Sinh",
                    "Sử - Địa - GDCD",
                    "Thể dục - QP",
                    "BGH",
                    "Khác",
                  ],
                 grades: [
                    "Khối 10",
                    "Khối 11",
                    "Khối 12",
                    "Toàn trường",
                  ],
                 documentCategories: [
                    "Công văn",
                    "Ảnh hoạt động",
                    "Thời khóa biểu",
                    "Kế hoạch giảng dạy",
                    "Khác",
                  ],
                 gasUrl: ""
               }, { merge: true });
            }
          }
        },
        (error) => console.error("Error fetching settings:", error)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, "settings", "general"),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.activeWeeksView !== undefined) {
              setActiveWeeksView(data.activeWeeksView);
            }
          }
        }
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          setUsers(
            snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as User),
          );
        },
        (error) => {
          console.error("Error fetching users:", error);
        },
      ),
    );

    // We must fetch all tasks because Firestore doesn't support multiple array-contains in an OR query,
    // and if we try to, it will crash and no tasks will load for non-admins.
    
    // Tính cutoffDate
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - activeWeeksView * 7);

    const q1 = query(collection(db, "tasks"), where("createdAt", ">=", cutoffDate.toISOString()));
    const q2 = query(collection(db, "tasks"), where("status", "in", ["todo", "doing"]));

    let q1Docs: Task[] = [];
    let q2Docs: Task[] = [];

    const mergeTasks = () => {
      const allDocs = [...q1Docs, ...q2Docs];
      // Build a unique map, preferring items from q2 or q1 docs
      const docMap = new Map();
      allDocs.forEach(d => docMap.set(d.id, d));
      const uniqueDocs = Array.from(docMap.values()) as Task[];

      let docs = uniqueDocs;
          
      if (currentUser && currentUser.role !== "admin") {
        docs = docs.filter((t) => {
          // 1. Creator always sees their tasks
          if (t.createdBy === currentUser.id) return true;
          // 2. Directly assigned individual always sees it
          if (t.assignedTo?.includes(currentUser.id)) return true;
          
          // Check if any specific targeting is applied (group targeting)
          const hasRoleTarget = t.targetRoles && t.targetRoles.length > 0;
          const hasDeptTarget = t.targetDepartments && t.targetDepartments.length > 0;
          const hasGradeTarget = t.targetGrades && t.targetGrades.length > 0;
          const hasSpecificTargets = hasRoleTarget || hasDeptTarget || hasGradeTarget;

          if (hasSpecificTargets) {
            // Must match at least one of the specific targets
            if (currentUser.role && t.targetRoles?.includes(currentUser.role)) return true;
            if (currentUser.department && t.targetDepartments?.includes(currentUser.department)) return true;
            if (currentUser.grade && t.targetGrades?.includes(currentUser.grade)) return true;
            return false; // Did not match any specific target
          }

          // 3. Fallback to broad visibility completely public tasks
          return t.visibility === "public";
        });
      }
      setTasks(docs.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    };

    unsubs.push(
      onSnapshot(
        q1,
        (snapshot) => {
          q1Docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
          mergeTasks();
        },
        (error) => {
          console.error("Error fetching tasks by date:", error);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        q2,
        (snapshot) => {
          q2Docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Task);
          mergeTasks();
        },
        (error) => {
          console.error("Error fetching tasks by status:", error);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, "comments"),
        (snapshot) => {
          setComments(
            snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment),
          );
        },
        (error) => {
          console.error("Error fetching comments:", error);
        },
      ),
    );

    unsubs.push(
      onSnapshot(
        collection(db, "documents"),
        (snapshot) => {
          setDocuments(
            snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Document),
          );
        },
        (error) => {
          console.error("Error fetching documents:", error);
        },
      ),
    );

    return () => unsubs.forEach((fn) => fn());
  }, [currentUser, activeWeeksView]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        // Find existing user directly from firestore just to be safe
        const q = query(
          collection(db, "users"),
          where("email", "==", firebaseUser.email),
        );
        try {
          const qs = await getDocs(q);
          if (!qs.empty) {
            let appUser = { id: qs.docs[0].id, ...qs.docs[0].data() } as User;
            
            // Fix ID mismatch
            if (appUser.id !== firebaseUser.uid) {
              const correctedUser = { ...appUser, id: firebaseUser.uid };
              try {
                await setDoc(doc(db, "users", firebaseUser.uid), correctedUser);
                await deleteDoc(doc(db, "users", appUser.id)).catch(() => {});
                appUser = correctedUser;
              } catch (e) {
                console.error("Migration failed in context", e);
              }
            }

            setCurrentUser(appUser);
            if (appUser.role === "admin" || appUser.role === "leader") {
              setActiveTab("dashboard");
            } else {
              setActiveTab("tasks");
            }
          } else {
            setCurrentUser(null);
          }
        } catch (error) {
          console.error("Auth init fetch user error:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const requestNotificationPermission = async () => {
    try {
      if (!messaging) return;
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && currentUser) {
        const token = await getToken(messaging);
        
        if (token) {
          const userRef = doc(db, 'users', currentUser.id);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentTokens = userData.fcmTokens || [];
            
            if (!currentTokens.includes(token)) {
              await updateDoc(userRef, {
                fcmTokens: [...currentTokens, token]
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('An error occurred while requesting notification permission:', error);
    }
  };

  useEffect(() => {
    if (currentUser && messaging) {
      requestNotificationPermission();

      const unsubscribeMessage = onMessage(messaging, (payload) => {
        showToast(`🔔 ${payload.notification?.title || 'Thông báo mới'}: ${payload.notification?.body || ''}`);
      });

      return () => unsubscribeMessage();
    }
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const showToast = (message: string, onUndo?: () => void) => {
    const id = Math.random().toString();
    setToast({ id, message, onUndo });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 5000);
  };

  const hideToast = () => setToast(null);

  const addUser = async (userData: Partial<User>) => {
    const newId = userData.id || auth.currentUser?.uid || Math.random().toString(36).substr(2, 9);
    const newUser: User = {
      role: "teacher",
      department: "Khác",
      grade: "",
      status: "approved",
      createdAt: new Date().toISOString(),
      ...userData,
      id: newId,
    } as User;

    // Optimistic
    setUsers((prev) => [...prev.filter((u) => u.id !== newId), newUser]);

    // Firestore
    await setDoc(doc(db, "users", newId), newUser).catch((err) => {
      console.error("Error adding user: ", err);
    });

    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    // Optimistic
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));

    updateDoc(doc(db, "users", id), updates).catch((err) => {
      console.error("Error updating user: ", err);
      alert("Error updating user: " + err.message);
    });
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    deleteDoc(doc(db, "users", id)).catch((err) => {
      console.error("Error deleting user: ", err);
    });
  };

  const addTask = (taskData: Omit<Task, "id" | "createdAt">) => {
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

    // Optimistic
    setTasks((prev) => [newTask, ...prev]);

    // Firestore
    setDoc(doc(db, "tasks", newId), newTask)
      .then(() => {
        if (
          taskData.category === "announcement" &&
          taskData.attachments &&
          taskData.attachments.length > 0
        ) {
          taskData.attachments.forEach((att) => {
            const docId = doc(collection(db, "documents")).id;
            const newDocData: Document = {
              id: docId,
              title: att.title || taskData.title,
              driveUrl: att.url,
              createdAt: new Date().toISOString(),
              createdBy: taskData.createdBy,
            } as Document;
            setDoc(doc(db, "documents", docId), newDocData);
          });
        }
      })
      .catch((err) => {
        console.error("Error adding task: ", err);
        alert("Lỗi khi thêm task: " + err.message);
      });
  };

  const editTask = (taskId: string, updates: Partial<Task>, notifyAgain: boolean) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        if (notifyAgain) {
          return { ...t, ...updates, readReceipts: [] };
        }
        return { ...t, ...updates };
      }
      return t;
    }));
    
    const dbUpdates: any = { ...updates };
    if (notifyAgain) {
      dbUpdates.readReceipts = [];
    }
    
    updateDoc(doc(db, "tasks", taskId), dbUpdates).catch(err => {
      console.error("Error editing task", err);
      alert("Lỗi khi cập nhật công việc: " + err.message);
    });
  };

  const updateTaskStatus = (taskId: string, status: Task["status"]) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
    updateDoc(doc(db, "tasks", taskId), { status }).catch((err) =>
      console.error(err),
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== taskId));
    deleteDoc(doc(db, "tasks", taskId)).catch((err) => console.error(err));
  };

  const markTaskRead = async (taskId: string) => {
    if (!currentUser) return;
    try {
      const taskRef = doc(db, "tasks", taskId);
      const taskSnap = await getDoc(taskRef);
      if (taskSnap.exists()) {
        const currentReads = taskSnap.data().readBy || [];
        if (!currentReads.includes(currentUser.id)) {
          await updateDoc(taskRef, {
            readBy: [...currentReads, currentUser.id],
          });
        }
      }
      // Optimistic
      setTasks((prevTasks) => {
        let changed = false;
        const newTasks = prevTasks.map((t) => {
          if (t.id === taskId) {
            const readBy = t.readBy || [];
            if (!readBy.includes(currentUser.id)) {
              changed = true;
              return { ...t, readBy: [...readBy, currentUser.id] };
            }
          }
          return t;
        });
        return changed ? newTasks : prevTasks;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const votePoll = async (taskId: string, optionId: string | null) => {
    if (!currentUser) return;
    try {
      const taskRef = doc(db, "tasks", taskId);
      const taskSnap = await getDoc(taskRef);
      const data = taskSnap.data();
      let newOptions = [];
      let newReadBy = [];
      if (data && data.category === "poll" && data.pollOptions) {
        let isRemovingExisting = false;
        newOptions = data.pollOptions.map((opt: any) => {
          const hasUser = opt.votes.includes(currentUser.id);
          if (hasUser && opt.id === optionId) {
            isRemovingExisting = true;
          }
          return {
            ...opt,
            votes: opt.votes.filter((id: string) => id !== currentUser.id),
          };
        });

        if (!isRemovingExisting && optionId !== null) {
          const targetOption = newOptions.find(
            (opt: any) => opt.id === optionId,
          );
          if (targetOption) {
            targetOption.votes.push(currentUser.id);
          }
        }
        newReadBy = data.readBy || [];
        if (!newReadBy.includes(currentUser.id)) newReadBy.push(currentUser.id);

        await updateDoc(taskRef, {
          pollOptions: newOptions,
          readBy: newReadBy,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTaskLock = async (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, isLocked: !t.isLocked } : t,
      ),
    );
    try {
      const taskRef = doc(db, "tasks", taskId);
      const taskSnap = await getDoc(taskRef);
      if (taskSnap.exists()) {
        await updateDoc(taskRef, { isLocked: !taskSnap.data().isLocked });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTaskUrgent = async (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, isUrgent: !t.isUrgent } : t,
      ),
    );
    try {
      const taskRef = doc(db, "tasks", taskId);
      const taskSnap = await getDoc(taskRef);
      if (taskSnap.exists()) {
        await updateDoc(taskRef, { isUrgent: !taskSnap.data().isUrgent });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCommentsLock = async (taskId: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, commentsLocked: !t.commentsLocked } : t,
      ),
    );
    try {
      const taskRef = doc(db, "tasks", taskId);
      const taskSnap = await getDoc(taskRef);
      if (taskSnap.exists()) {
        await updateDoc(taskRef, { commentsLocked: !taskSnap.data().commentsLocked });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitReport = async (
    taskId: string,
    content: string,
    url?: string,
    data?: Record<string, string | number>,
    status?: UserTaskStatus
  ) => {
    if (!currentUser) return;
    try {
      const taskRef = doc(db, "tasks", taskId);
      const taskSnap = await getDoc(taskRef);
      if (taskSnap.exists()) {
        const submissions = taskSnap.data().submissions || [];
        const existingIndex = submissions.findIndex(
          (r: any) => r.userId === currentUser.id,
        );

        let newSubmissions = [...submissions];
        if (existingIndex >= 0) {
          newSubmissions[existingIndex] = {
            ...newSubmissions[existingIndex],
            content: content !== undefined ? content : (newSubmissions[existingIndex].content || ""),
            fileUrl: url !== undefined ? url : (newSubmissions[existingIndex].fileUrl || ""),
            data: data !== undefined ? data : (newSubmissions[existingIndex].data || null),
            status: status || newSubmissions[existingIndex].status || 'done',
            submittedAt: new Date().toISOString(),
          };
        } else {
          newSubmissions.push({
            userId: currentUser.id,
            fileUrl: url || "",
            content: content || "",
            data: data || null,
            status: status || 'done',
            submittedAt: new Date().toISOString(),
          });
        }
        
        const updateData: any = { submissions: newSubmissions };
        
        const assignedTo = taskSnap.data().assignedTo || [];
        if (assignedTo.length > 0) {
          const allSubmitted = assignedTo.every((uid: string) => newSubmissions.some((s: any) => s.userId === uid && (!s.status || s.status === 'done')));
          if (allSubmitted) {
            updateData.status = 'done';
          }
        }

        // Optimistic update
        setTasks((prev) =>
          prev.map((t) => {
            if (t.id === taskId) {
              return { ...t, ...updateData };
            }
            return t;
          }),
        );

        await updateDoc(taskRef, updateData);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi lưu DB: " + (e as Error).message);
    }
  };

  const addComment = (
    taskId: string,
    content: string,
    parentId?: string | null,
  ) => {
    if (!currentUser) return;
    const newId = doc(collection(db, "comments")).id;
    const newComment: Comment = {
      id: newId,
      taskId,
      parentId: parentId || null,
      userId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
    };

    // Optimistic
    setComments((prev) => [...prev, newComment]);

    setDoc(doc(db, "comments", newId), newComment).catch((err) => {
      console.error("Error adding comment: ", err);
    });
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
        departments,
        setDepartments,
        grades,
        setGrades,
        documentCategories,
        setDocumentCategories,
        gasUrl,
        setGasUrl,
        activeWeeksView,
        setActiveWeeksView: updateActiveWeeksView,
        activeTab,
        setActiveTab,
        toast,
        showToast,
        hideToast,
        authReady,
        addUser,
        updateUser,
        deleteUser,
        addTask,
        editTask,
        updateTaskStatus,
        deleteTask,
        markTaskRead,
        votePoll,
        toggleTaskLock,
        toggleTaskUrgent,
        toggleCommentsLock,
        submitReport,
        addComment,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
