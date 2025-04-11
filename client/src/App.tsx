import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import PaymentReceipt from "@/pages/PaymentReceipt";

function Router() {
  return (
    <Switch>
      {/* Add pages below */}
      <Route path="/" component={PaymentReceipt} />
      <Route path="/receipts/:id" component={PaymentReceipt} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
