import { useAuth } from "@/contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return user ? <ChatPage /> : <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <AppContent />
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
