import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import WorkshopsPage from "./pages/WorkshopsPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import RegisterServicePage from "./pages/RegisterServicePage.tsx";
import FAQPage from "./pages/FAQPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import ServicesManager from "./pages/admin/ServicesManager.tsx";
import QuestionnaireBuilder from "./pages/admin/QuestionnaireBuilder.tsx";
import RegistrationsManager from "./pages/admin/RegistrationsManager.tsx";
import Analytics from "./pages/admin/Analytics.tsx";
import AdminGuard from "./components/admin/AdminGuard.tsx";
import AdminsManager from "./pages/admin/AdminsManager.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/workshops" element={<WorkshopsPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/:serviceId" element={<RegisterServicePage />} />
          <Route path="/faq" element={<FAQPage />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><Dashboard /></AdminGuard>} />
          <Route path="/admin/services" element={<AdminGuard><ServicesManager /></AdminGuard>} />
          <Route path="/admin/services/:id/questionnaire" element={<AdminGuard><QuestionnaireBuilder /></AdminGuard>} />
          <Route path="/admin/registrations" element={<AdminGuard><RegistrationsManager /></AdminGuard>} />
          <Route path="/admin/analytics" element={<AdminGuard><Analytics /></AdminGuard>} />
          <Route path="/admin/admins" element={<AdminGuard><AdminsManager /></AdminGuard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
