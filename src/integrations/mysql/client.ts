/**
 * MySQL-compatible client — drop-in replacement for the Supabase client.
 * Exposes the same .auth.* and .from().select/insert/update/delete/eq/... API.
 * All components that import from "@/integrations/supabase/client" use this
 * transparently when VITE_USE_MYSQL=true.
 */

const API_URL = import.meta.env.VITE_MYSQL_API_URL || 'http://localhost:4000';

// ── Token helpers ─────────────────────────────────────────────────────────────
const TOKEN_KEY = 'mysql_auth_token';
const USER_KEY  = 'mysql_auth_user';

function getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
function setToken(t: string | null) {
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
}
function getStoredUser(): MysqlUser | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
function setStoredUser(u: MysqlUser | null) {
  u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY);
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MysqlUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    name?: string;
    prefix?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    gender?: string | null;
    designation?: string | null;
    phone_number?: string | null;
  };
}

// Supabase-compatible shape
export type User    = MysqlUser;
export type Session = { user: MysqlUser; access_token: string };

// Keep a list of auth state listeners
type AuthListener = (event: string, session: Session | null) => void;
const authListeners: AuthListener[] = [];

function notifyListeners(event: string, session: Session | null) {
  authListeners.forEach(fn => fn(event, session));
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<{ data: unknown; error: string | null; status: number }> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  let body: Record<string, unknown>;
  try { body = await response.json(); } catch { body = {}; }

  if (!response.ok) {
    return { data: null, error: (body.error as string) || response.statusText, status: response.status };
  }
  return { data: body.data !== undefined ? body.data : body, error: null, status: response.status };
}

// ── Auth API ──────────────────────────────────────────────────────────────────
const auth = {
  async signUp({ email, password, options }: { email: string; password: string; options?: Record<string, unknown> }) {
    const res = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, options }),
    });
    if (res.error) return { data: { user: null }, error: { message: res.error } };
    const { user, token } = res.data as { user: MysqlUser; token: string };
    setToken(token);
    setStoredUser(user);
    const session: Session = { user, access_token: token };
    notifyListeners('SIGNED_IN', session);
    return { data: { user }, error: null };
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.error) return { data: { user: null, session: null }, error: { message: res.error } };
    const { user, token } = res.data as { user: MysqlUser; token: string };
    setToken(token);
    setStoredUser(user);
    const session: Session = { user, access_token: token };
    notifyListeners('SIGNED_IN', session);
    return { data: { user, session }, error: null };
  },

  async signOut() {
    await apiFetch('/auth/logout', { method: 'POST' });
    setToken(null);
    setStoredUser(null);
    notifyListeners('SIGNED_OUT', null);
    return { error: null };
  },

  async getUser() {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    const res = await apiFetch('/auth/user');
    if (res.error) {
      setToken(null); setStoredUser(null);
      return { data: { user: null }, error: { message: res.error } };
    }
    const user = (res.data as { user: MysqlUser }).user || res.data as MysqlUser;
    setStoredUser(user);
    return { data: { user }, error: null };
  },

  async getSession() {
    const token = getToken();
    const user  = getStoredUser();
    if (!token || !user) return { data: { session: null }, error: null };
    return { data: { session: { user, access_token: token } as Session }, error: null };
  },

  async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
    const res = await apiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, redirectTo: options?.redirectTo }),
    });
    if (res.error) return { error: { message: res.error } };
    return { error: null };
  },

  async updateUser({ password }: { password: string }) {
    // For password update after reset — reads token+email from URL search params
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token') || '';
    const email  = params.get('email') || '';
    const res = await apiFetch('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, newPassword: password }),
    });
    if (res.error) return { error: { message: res.error } };
    return { error: null };
  },

  onAuthStateChange(callback: AuthListener) {
    authListeners.push(callback);
    // Immediately fire with current state
    const token = getToken();
    const user  = getStoredUser();
    if (token && user) {
      setTimeout(() => callback('SIGNED_IN', { user, access_token: token }), 0);
    } else {
      setTimeout(() => callback('SIGNED_OUT', null), 0);
    }
    return {
      data: {
        subscription: {
          unsubscribe() {
            const idx = authListeners.indexOf(callback);
            if (idx > -1) authListeners.splice(idx, 1);
          },
        },
      },
    };
  },
};

// ── Query Builder ─────────────────────────────────────────────────────────────
// Builds and executes REST calls to the Express API
// Mirrors: supabase.from('table').select('*').eq('col', val).single()

type FilterOp = { col: string; val: unknown };
type OrderOp  = { col: string; ascending: boolean };

const TABLE_ROUTE_MAP: Record<string, string> = {
  courses:              '/courses',
  course_modules:       '/modules',
  course_roadmap_items: '/roadmap',
  user_enrollments:     '/enrollments',
  user_module_progress: '/progress',
  quiz_questions:       '/quiz/questions',
  quiz_attempts:        '/quiz/attempts',
  contact_requests:     '/contact',
  profiles:             '/profiles',
  user_roles:           '/admin/roles',
};

class QueryBuilder {
  private table: string;
  private route: string;
  private _filters: FilterOp[] = [];
  private _order: OrderOp | null = null;
  private _limit: number | null  = null;
  private _isSingle = false;
  private _operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private _selectCols = '*';
  private _body: Record<string, unknown> | null = null;

  constructor(table: string) {
    this.table = table;
    this.route = TABLE_ROUTE_MAP[table] || `/${table}`;
  }

  select(cols = '*') { this._operation = 'select'; this._selectCols = cols; return this; }
  insert(body: Record<string, unknown> | Record<string, unknown>[]) { this._operation = 'insert'; this._body = Array.isArray(body) ? body[0] : body; return this; }
  update(body: Record<string, unknown>) { this._operation = 'update'; this._body = body; return this; }
  upsert(body: Record<string, unknown>, _opts?: unknown) { this._operation = 'insert'; this._body = body; return this; }
  delete() { this._operation = 'delete'; return this; }

  eq(col: string, val: unknown)  { this._filters.push({ col, val }); return this; }
  neq(col: string, val: unknown) { this._filters.push({ col: `${col}:neq`, val }); return this; }
  in(col: string, vals: unknown[]) { this._filters.push({ col: `${col}:in`, val: vals.join(',') }); return this; }

  order(col: string, opts?: { ascending?: boolean }) {
    this._order = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this._limit = n; return this; }
  single() { this._isSingle = true; return this; }
  /** Like single() but returns null data (no error) when no row found */
  maybeSingle() { this._isSingle = true; return this; }

  // ── RPC helper (used by .rpc() on mysqlClient)
  async rpcHasRole(userId: string, role: string): Promise<{ data: boolean; error: null | { message: string } }> {
    const res = await apiFetch(`/auth/has-role?user_id=${userId}&role=${role}`);
    if (res.error) return { data: false, error: { message: res.error } };
    return { data: (res.data as { has_role: boolean }).has_role, error: null };
  }

  async rpcGetQuizQuestions(moduleId: string) {
    const res = await apiFetch(`/modules/${moduleId}/quiz-questions`);
    return res;
  }

  // ── Execute ──────────────────────────────────────────────────────────────
  private buildQueryString(): string {
    const params = new URLSearchParams();
    for (const f of this._filters) {
      params.append(f.col, String(f.val));
    }
    if (this._limit) params.append('_limit', String(this._limit));
    if (this._order) params.append('_order', `${this._order.col}:${this._order.ascending ? 'asc' : 'desc'}`);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private findIdFilter(): string | null {
    const idF = this._filters.find(f => f.col === 'id');
    return idF ? String(idF.val) : null;
  }

  private findFilter(col: string): string | null {
    const f = this._filters.find(ff => ff.col === col);
    return f ? String(f.val) : null;
  }

  async then(resolve: (val: { data: unknown; error: null | { message: string } }) => void) {
    const result = await this._execute();
    resolve(result);
  }

  async _execute(): Promise<{ data: unknown; error: null | { message: string } }> {
    try {
      const id = this.findIdFilter();

      if (this._operation === 'select') {
        // ── Special case: enrollment check (user_id + course_id, maybeSingle)
        // Uses /enrollments/:courseId/check so the backend filters by JWT user + course
        if (this.table === 'user_enrollments' && this._isSingle) {
          const courseId = this.findFilter('course_id');
          if (courseId) {
            const res = await apiFetch(`/enrollments/${courseId}/check`);
            // Returns the enrollment row or null — exactly what maybeSingle expects
            return { data: res.status === 404 ? null : res.data, error: res.error ? { message: res.error } : null };
          }
        }

        // ── Single by id
        if (id && this._isSingle) {
          const res = await apiFetch(`${this.route}/${id}`);
          return { data: res.data, error: res.error ? { message: res.error } : null };
        }

        // ── General list with query string filters
        const qs = this.buildQueryString();
        const res = await apiFetch(`${this.route}${qs}`);
        let data = res.data;
        if (this._isSingle && Array.isArray(data)) data = data[0] ?? null;
        return { data, error: res.error ? { message: res.error } : null };
      }

      if (this._operation === 'insert') {
        const res = await apiFetch(this.route, {
          method: 'POST',
          body: JSON.stringify(this._body),
        });
        let data = res.data;
        if (this._isSingle && Array.isArray(data)) data = data[0] ?? null;
        return { data, error: res.error ? { message: res.error } : null };
      }

      if (this._operation === 'update') {
        // ── Special case: enrollment update via user_id + course_id
        // CourseDetail updates progress with .eq('user_id', uid).eq('course_id', cid)
        if (this.table === 'user_enrollments' && !id) {
          const courseId = this.findFilter('course_id');
          if (courseId) {
            // GET the enrollment id first, then PATCH it
            const checkRes = await apiFetch(`/enrollments/${courseId}/check`);
            if (checkRes.data && (checkRes.data as { id: string }).id) {
              const enrollmentId = (checkRes.data as { id: string }).id;
              const res = await apiFetch(`/enrollments/${enrollmentId}`, {
                method: 'PUT',
                body: JSON.stringify(this._body),
              });
              return { data: res.data, error: res.error ? { message: res.error } : null };
            }
          }
          return { data: null, error: null };
        }

        if (!id) return { data: null, error: { message: 'No id filter for update' } };
        const res = await apiFetch(`${this.route}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(this._body),
        });
        let data = res.data;
        if (this._isSingle && Array.isArray(data)) data = data[0] ?? null;
        return { data, error: res.error ? { message: res.error } : null };
      }

      if (this._operation === 'delete') {
        if (!id) return { data: null, error: { message: 'No id filter for delete' } };
        const res = await apiFetch(`${this.route}/${id}`, { method: 'DELETE' });
        return { data: res.data, error: res.error ? { message: res.error } : null };
      }

      return { data: null, error: { message: 'Unknown operation' } };
    } catch (err: unknown) {
      return { data: null, error: { message: err instanceof Error ? err.message : 'Request failed' } };
    }
  }
}

// ── RPC ──────────────────────────────────────────────────────────────────────
async function rpc(
  fn: string,
  args: Record<string, unknown>
): Promise<{ data: unknown; error: null | { message: string } }> {
  if (fn === 'has_role') {
    const qb = new QueryBuilder('user_roles');
    return qb.rpcHasRole(args['_user_id'] as string, args['_role'] as string);
  }
  if (fn === 'get_quiz_questions') {
    const res = await apiFetch(`/modules/${args['p_module_id']}/quiz-questions`);
    return { data: res.data, error: res.error ? { message: res.error } : null };
  }
  return { data: null, error: { message: `Unknown RPC function: ${fn}` } };
}

// ── Storage (stub — no Supabase Storage in MySQL version) ─────────────────────
const storage = {
  from(_bucket: string) {
    return {
      upload: async (_path: string, _file: File) => ({ data: null, error: { message: 'Storage not available in MySQL mode' } }),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
    };
  },
};

// ── Main exported client ──────────────────────────────────────────────────────
export const mysqlClient = {
  auth,
  from: (table: string) => new QueryBuilder(table),
  rpc,
  storage,
};
