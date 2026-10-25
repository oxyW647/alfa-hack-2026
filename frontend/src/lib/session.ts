import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

const env = import.meta.env;

const ACCOUNTS: Record<Role, { email?: string; password?: string }> = {
  client: { email: env.VITE_DEMO_CLIENT_EMAIL, password: env.VITE_DEMO_CLIENT_PASSWORD },
  employee: { email: env.VITE_DEMO_EMPLOYEE_EMAIL, password: env.VITE_DEMO_EMPLOYEE_PASSWORD },
};

export async function signInAs(role: Role): Promise<void> {
  const { email, password } = ACCOUNTS[role];
  const response = await api.post<{ access_token: string }>("/auth/login", { email, password });
  useAuth.getState().setToken(response.data.access_token);
}
