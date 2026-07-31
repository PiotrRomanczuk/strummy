export interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export interface NewKeyResponse extends ApiKey {
  key: string;
  warning: string;
}
