import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import DealerManagement from "@/pages/DealerManagement";
import Inventory from "@/pages/Inventory";
import AdCreator from "@/pages/AdCreator";
import AdStaging from "@/pages/AdStaging";
import Dashboard from "@/pages/Dashboard";
import ContentGenerator from "@/pages/ContentGenerator";
import Templates from "@/pages/Templates";
import { DealerLayout } from "@/components/DealerLayout";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/dealers" component={DealerManagement} />
      <Route path="/inventory/:dealerId">
        {(params) => (
          <DealerLayout dealerId={params.dealerId}>
            <Inventory />
          </DealerLayout>
        )}
      </Route>
      <Route path="/ads/create/:inventoryId" component={AdCreator} />
      <Route path="/ads/staging/:dealerId">
        {(params) => (
          <DealerLayout dealerId={params.dealerId}>
            <AdStaging />
          </DealerLayout>
        )}
      </Route>
      <Route path="/dashboard/:dealerId">
        {(params) => (
          <DealerLayout dealerId={params.dealerId}>
            <Dashboard />
          </DealerLayout>
        )}
      </Route>
      <Route path="/content/:adId" component={ContentGenerator} />
      <Route path="/templates" component={Templates} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
