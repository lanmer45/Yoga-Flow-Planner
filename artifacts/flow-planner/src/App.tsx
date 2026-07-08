import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Library from "@/pages/library";
import RoutineDetail from "@/pages/routine-detail";
import Builder from "@/pages/builder";
import Runner from "@/pages/runner";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Library} />
      <Route path="/routines/:id" component={RoutineDetail} />
      <Route path="/builder" component={Builder} />
      <Route path="/builder/:id" component={Builder} />
      <Route path="/run/:id" component={Runner} />
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
