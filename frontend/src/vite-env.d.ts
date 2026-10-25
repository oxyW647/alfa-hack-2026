interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_DEMO_CLIENT_EMAIL?: string;
  readonly VITE_DEMO_CLIENT_PASSWORD?: string;
  readonly VITE_DEMO_EMPLOYEE_EMAIL?: string;
  readonly VITE_DEMO_EMPLOYEE_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
