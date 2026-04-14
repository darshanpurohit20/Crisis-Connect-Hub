import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import CallerEntry from "@/pages/CallerEntry";
import CallerCall from "@/pages/CallerCall";
import OperatorLogin from "@/pages/OperatorLogin";
import OperatorRegister from "@/pages/OperatorRegister";
import OperatorDashboard from "@/pages/OperatorDashboard";
import InsightsDashboard from "@/pages/InsightsDashboard";
import NotFound from "@/pages/not-found";
import { setBaseUrl } from "@workspace/api-client-react";

setBaseUrl(import.meta.env.VITE_API_URL || "http://localhost:3000");
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/caller" component={CallerEntry} />
      <Route path="/caller/call/:callId" component={CallerCall} />
      <Route path="/operator/login" component={OperatorLogin} />
      <Route path="/operator/register" component={OperatorRegister} />
      <Route path="/operator/dashboard" component={OperatorDashboard} />
      <Route path="/operator/dashboard/insights" component={InsightsDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
