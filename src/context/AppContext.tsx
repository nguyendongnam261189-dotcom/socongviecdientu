// ⚠️ TOÀN BỘ FILE GIỮ NGUYÊN
// 🔥 CHỈ SỬA DUY NHẤT HÀM addTask (đã đánh dấu)

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

/* ====== giữ nguyên toàn bộ phần interface + state ====== */

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

  addTask: (task: Omit<Task, "id" | "createdAt">) => Promise<void>; // 🔥 sửa type
}

/* ====== giữ nguyên toàn bộ code phía trên ====== */

const AppContext = createContext<AppContextType | undefined>(undefined);

/* ====== giữ nguyên toàn bộ provider ====== */

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  /* ====== giữ nguyên toàn bộ state và useEffect ====== */

  /* ===================== 🔥 CHỈ SỬA HÀM NÀY ===================== */

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

    // 🔥 Optimistic UI (giữ nguyên)
    setTasks((prev) => [newTask, ...prev]);

    try {
      // 🔥 QUAN TRỌNG: await thật sự
      await setDoc(doc(db, "tasks", newId), newTask);

      // 🔥 giữ nguyên logic document
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

      // 🔥 rollback nếu lỗi
      setTasks((prev) => prev.filter((t) => t.id !== newId));

      throw err;
    }
  };

  /* ===================== KẾT THÚC SỬA ===================== */

  /* ====== giữ nguyên toàn bộ phần return ====== */

};
