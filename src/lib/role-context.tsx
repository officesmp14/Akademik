"use client";

import { createContext, useContext } from "react";
import { UserRole, ModuleAccessEntry } from "@/lib/current-user";

type RoleContextValue = {
  role: UserRole | null;
  gtkId: string | null;
  gtkNama: string | null;
  email: string;
  moduleAccess: ModuleAccessEntry[];
  waliKelasRombel: string | null;
  hasMengajarKelas: boolean;
  isKetuaEkskul: boolean;
  isPanitiaPtsPas: boolean;
};

const RoleContext = createContext<RoleContextValue>({
  role: null,
  gtkId: null,
  gtkNama: null,
  email: "",
  moduleAccess: [],
  waliKelasRombel: null,
  hasMengajarKelas: false,
  isKetuaEkskul: false,
  isPanitiaPtsPas: false,
});

export function RoleProvider({
  value,
  children,
}: {
  value: RoleContextValue;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export function useModulePermission(module: string) {
  const { role, moduleAccess } = useRole();
  const isAdmin = role === "admin";
  const entry = moduleAccess.find((a) => a.module === module);

  return {
    canView: isAdmin || Boolean(entry?.can_view),
    canEdit: isAdmin || Boolean(entry?.can_edit),
    canDelete: isAdmin || Boolean(entry?.can_delete),
  };
}
