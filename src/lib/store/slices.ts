import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type EntityState<T> = {
  ids: string[];
  entities: Record<string, T>;
};

export type Gym = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  logo_url?: string;
  base_currency: string;
  enabled_sections?: string[];
  public_signup_enabled?: boolean;
};

export type GymPlan = {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  duration_days: number;
};

export type Member = {
  id: string;
  gym_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  zip_code?: string;
  national_id?: string;
  status: "active" | "inactive" | "expired" | "suspended";
  join_date: string;
  avatar_url?: string;
  created_at?: string;
  notes?: string;
  currentMembership?: Membership & { plan_name?: string };
  latestMembership?: Membership & { plan_name?: string };
};

export type Membership = {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  price: number;
  status: string;
};

export type Payment = {
  id: string;
  gym_id: string;
  member_id: string;
  membership_id?: string;
  amount: number;
  payment_method: "cash" | "card" | "transfer";
  paid_at: string;
};

export type Coach = {
  id: string;
  gym_id: string;
  full_name: string;
  phone?: string;
  specialty?: string;
  active: boolean;
};

export type AttendanceRecord = {
  id: string;
  gym_id: string;
  member_id: string;
  check_in: string;
};

export type AiInsight = {
  id: string;
  gym_id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role?: "owner" | "member" | "coach";
};

export type AuthState = {
  user: AuthUser | null;
  session: Record<string, unknown> | null;
  isAuthenticated: boolean;
  authMode: "login" | "signup";
  status: "idle" | "loading" | "error";
  error: string | null;
};

export type Locale = "en" | "fa";
export type ColorTheme = "ocean" | "midnight";

export type GymsState = EntityState<Gym> & {
  currentGymId: string;
};

export type SignupState = {
  activeLink: {
    gym_id: string;
    token: string;
    url: string;
  };
  status: "idle" | "loading" | "success" | "error";
};

export type AiState = {
  insights: EntityState<AiInsight>;
  churnRisk: Record<string, "low" | "medium" | "high">;
};

export type UiState = {
  locale: Locale;
  colorTheme: ColorTheme;
  loading: boolean;
  selectedMemberId: string | null;
  selectedCoachId: string | null;
  modal: {
    type: string | null;
    isOpen: boolean;
  };
};

const upsertEntity = <T extends { id: string }>(state: EntityState<T>, entity: T) => {
  if (!state.ids.includes(entity.id)) {
    state.ids.push(entity.id);
  }

  state.entities[entity.id] = entity;
};

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    session: null,
    isAuthenticated: false,
    authMode: "login",
    status: "idle",
    error: null,
  } as AuthState,
  reducers: {
    setAuth(state, action: PayloadAction<Pick<AuthState, "user" | "session">>) {
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.isAuthenticated = Boolean(action.payload.user && action.payload.session);
      state.status = "idle";
      state.error = null;
    },
    clearAuth(state) {
      state.user = null;
      state.session = null;
      state.isAuthenticated = false;
      state.status = "idle";
      state.error = null;
    },
    setAuthMode(state, action: PayloadAction<AuthState["authMode"]>) {
      state.authMode = action.payload;
      state.error = null;
    },
    setAuthStatus(state, action: PayloadAction<Pick<AuthState, "status" | "error">>) {
      state.status = action.payload.status;
      state.error = action.payload.error ?? null;
    },
  },
});

const gymsSlice = createSlice({
  name: "gyms",
  initialState: {
    currentGymId: "",
    ids: [],
    entities: {},
  } as GymsState,
  reducers: {
    upsertGym(state, action: PayloadAction<Gym>) {
      upsertEntity(state, action.payload);
    },
    setCurrentGymId(state, action: PayloadAction<string>) {
      state.currentGymId = action.payload;
    },
  },
});

const gymPlansSlice = createSlice({
  name: "gymPlans",
  initialState: {
    ids: [],
    entities: {},
  } as EntityState<GymPlan>,
  reducers: {
    upsertGymPlan(state, action: PayloadAction<GymPlan>) {
      upsertEntity(state, action.payload);
    },
    removeGymPlansForGym(state, action: PayloadAction<string>) {
      const gymId = action.payload;
      const idsToRemove = state.ids.filter((id) => state.entities[id]?.gym_id === gymId);
      state.ids = state.ids.filter((id) => !idsToRemove.includes(id));
      idsToRemove.forEach((id) => delete state.entities[id]);
    },
    removeGymPlan(state, action: PayloadAction<string>) {
      const planId = action.payload;
      state.ids = state.ids.filter((id) => id !== planId);
      delete state.entities[planId];
    },
  },
});

const membersSlice = createSlice({
  name: "members",
  initialState: {
    ids: [],
    entities: {},
  } as EntityState<Member>,
  reducers: {
    upsertMember(state, action: PayloadAction<Member>) {
      upsertEntity(state, action.payload);
    },
    removeMember(state, action: PayloadAction<string>) {
      state.ids = state.ids.filter((id) => id !== action.payload);
      delete state.entities[action.payload];
    },
    setMembers(state, action: PayloadAction<Member[]>) {
      state.ids = action.payload.map((m) => m.id);
      state.entities = Object.fromEntries(action.payload.map((m) => [m.id, m]));
    },
    deleteMember(state, action: PayloadAction<string>) {
      state.ids = state.ids.filter((id) => id !== action.payload);
      delete state.entities[action.payload];
    },
  },
});

const membershipsSlice = createSlice({
  name: "memberships",
  initialState: {
    ids: [],
    entities: {},
  } as EntityState<Membership>,
  reducers: {
    upsertMembership(state, action: PayloadAction<Membership>) {
      upsertEntity(state, action.payload);
    },
  },
});

const paymentsSlice = createSlice({
  name: "payments",
  initialState: {
    ids: [],
    entities: {},
  } as EntityState<Payment>,
  reducers: {
    upsertPayment(state, action: PayloadAction<Payment>) {
      upsertEntity(state, action.payload);
    },
  },
});

const coachesSlice = createSlice({
  name: "coaches",
  initialState: {
    ids: [],
    entities: {},
  } as EntityState<Coach>,
  reducers: {
    upsertCoach(state, action: PayloadAction<Coach>) {
      upsertEntity(state, action.payload);
    },
  },
});

const attendanceSlice = createSlice({
  name: "attendance",
  initialState: {
    ids: [],
    entities: {},
  } as EntityState<AttendanceRecord>,
  reducers: {
    upsertAttendance(state, action: PayloadAction<AttendanceRecord>) {
      upsertEntity(state, action.payload);
    },
  },
});

const signupSlice = createSlice({
  name: "signup",
  initialState: {
    activeLink: {
      gym_id: "",
      token: "",
      url: "",
    },
    status: "idle",
  } as SignupState,
  reducers: {
    setSignupLink(state, action: PayloadAction<SignupState["activeLink"]>) {
      state.activeLink = action.payload;
      state.status = "success";
    },
    setSignupStatus(state, action: PayloadAction<SignupState["status"]>) {
      state.status = action.payload;
    },
  },
});

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    locale: "fa",
    colorTheme: "ocean",
    loading: false,
    selectedMemberId: null,
    selectedCoachId: null,
    modal: {
      type: null,
      isOpen: false,
    },
  } as UiState,
  reducers: {
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
    setColorTheme(state, action: PayloadAction<ColorTheme>) {
      state.colorTheme = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setSelectedMemberId(state, action: PayloadAction<string | null>) {
      state.selectedMemberId = action.payload;
    },
    setSelectedCoachId(state, action: PayloadAction<string | null>) {
      state.selectedCoachId = action.payload;
    },
    openModal(state, action: PayloadAction<string>) {
      state.modal.type = action.payload;
      state.modal.isOpen = true;
    },
    closeModal(state) {
      state.modal.type = null;
      state.modal.isOpen = false;
    },
  },
});

const aiSlice = createSlice({
  name: "ai",
  initialState: {
    insights: {
      ids: [],
      entities: {},
    },
    churnRisk: {},
  } as AiState,
  reducers: {
    upsertInsight(state, action: PayloadAction<AiInsight>) {
      upsertEntity(state.insights, action.payload);
    },
    setChurnRisk(
      state,
      action: PayloadAction<{ memberId: string; risk: "low" | "medium" | "high" }>,
    ) {
      state.churnRisk[action.payload.memberId] = action.payload.risk;
    },
  },
});

export const authActions = authSlice.actions;
export const gymsActions = gymsSlice.actions;
export const gymPlansActions = gymPlansSlice.actions;
export const membersActions = membersSlice.actions;
export const membershipsActions = membershipsSlice.actions;
export const paymentsActions = paymentsSlice.actions;
export const coachesActions = coachesSlice.actions;
export const attendanceActions = attendanceSlice.actions;
export const signupActions = signupSlice.actions;
export const uiActions = uiSlice.actions;
export const aiActions = aiSlice.actions;

export const reducers = {
  auth: authSlice.reducer,
  gyms: gymsSlice.reducer,
  gymPlans: gymPlansSlice.reducer,
  members: membersSlice.reducer,
  memberships: membershipsSlice.reducer,
  payments: paymentsSlice.reducer,
  coaches: coachesSlice.reducer,
  attendance: attendanceSlice.reducer,
  signup: signupSlice.reducer,
  ui: uiSlice.reducer,
  ai: aiSlice.reducer,
};
