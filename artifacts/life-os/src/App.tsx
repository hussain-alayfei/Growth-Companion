import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from '@/pages/Home';
import Trading from '@/pages/Trading';
import Coach from '@/pages/Coach';
import Progress from '@/pages/Progress';
import Education from '@/pages/Education';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/trading" component={Trading} />
      <Route path="/coach" component={Coach} />
      <Route path="/progress" component={Progress} />
      <Route path="/education" component={Education} />
      <Route>
        <div className="min-h-screen flex items-center justify-center text-foreground bg-background">
          <h1>٤٠٤ - الصفحة غير موجودة</h1>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
