import { authClient } from "../utils/auth";
import { createContext, useContext, type ReactNode } from "react";

type UserState = {
    loading: boolean;
    email: string | null;
    createdAt?: Date;
};

type AuthContextValue = {
    userState: UserState;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// useSession updates on sign in / sign out, so everything using the context follows the login state
export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: session, isPending } = authClient.useSession();

    const userState: UserState = session?.user?.email
        ? { loading: false, email: session.user.email, createdAt: session.user.createdAt }
        : { loading: isPending, email: null };

    const logout = async () => {
        await authClient.signOut();
    };

    const deleteAccount = async () => {
        await authClient.deleteUser();
    };

    return (
        <AuthContext.Provider value={{ userState, logout, deleteAccount }
        }>
            {children}
        </AuthContext.Provider>
    );
}

export function useUserState() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useUserState must be used within AuthProvider");
    return ctx;
}