"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated, getCurrentUserWithFallback } from "@/lib/auth";
import { API_URL } from "@/constant";
import { loginSchema, LoginSchemaType } from "@/schemas/loginSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  Loader2, 
  Shield,
  Chrome,
  Github,
  Apple
} from "lucide-react";
import { cn } from "@/lib/utils";

const LoginForm = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Clear any existing tokens and set up the form
  useEffect(() => {
    // Clear any existing tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Set mounted state for animations
    setMounted(true);
    
    // Check for remembered credentials
    const rememberedEmail = localStorage.getItem("remembered_email");
    if (rememberedEmail) {
      form.setValue("email", rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginSchemaType) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/users/token/`,
        {
          email: data.email,
          password: data.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      const { access, refresh, user } = response.data;
      
      // Store tokens and user data
      try {
        localStorage.setItem("access_token", access);
        localStorage.setItem("refresh_token", refresh);
        localStorage.setItem("user", JSON.stringify(user));
        
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem("remembered_email", data.email);
        } else {
          localStorage.removeItem("remembered_email");
        }
        
        console.log('Tokens and user data stored successfully');
      } catch (error) {
        console.error('Error storing auth data:', error);
        throw new Error('Failed to store authentication data');
      }

      // Show success message
      toast({
        title: "Welcome back!",
        description: "Login successful. Redirecting to your dashboard...",
      });
      
      // Get user role or default to 'user'
      const userRole = (user?.organization_role || user?.role || 'user').toLowerCase();
      
      // Map role to dashboard path with debug logging
      const getDashboardPath = (role: string): string => {
        console.log('User role detected:', role);
        
        // Normalize role names to match the ones in the JWT token
        const normalizedRole = role.toLowerCase().replace(/[^a-z0-9]/g, '_');
        
        // Define role to path mappings
        const roleMappings: Record<string, string> = {
          // Super Admin
          'superadmin': '/superadmin',
          'super_admin': '/superadmin',
          
          // Organization Admin/Manager
          'admin': '/organization/dashboard',
          'organization_admin': '/organization/dashboard',
          'org_admin': '/organization/dashboard',
          'organization': '/organization/dashboard',
          
          // Project Manager
          'project_manager': '/organization/overview',
          'projectmanager': '/organization/overview',
          'pmanager': '/organization/overview',
          
          // Developer
          'developer': '/organization/developer/dashboard',
          'dev': '/organization/developer/dashboard',
          
          // Sales
          'sales': '/organization/sales/dashboard',
          'salesperson': '/organization/sales/dashboard',
          'sales_rep': '/organization/sales/dashboard',
          
          // Support
          'support': '/organization/support/dashboard',
          'support_agent': '/organization/support/dashboard',
          
          // Verifier
          'verifier': '/organization/verifier/dashboard',
          'verification': '/organization/verifier/dashboard',
          
          // Default user role
          'user': '/organization/user/dashboard',
          'member': '/organization/user/dashboard',
          'default': '/organization/user/dashboard'
        };
        
        // Find the matching path or default to user dashboard
        const path = roleMappings[normalizedRole] || '/organization/user/dashboard';
        console.log(`Mapped role '${role}' (normalized: '${normalizedRole}') to path:`, path);
        return path;
      };
      
      const dashboardPath = getDashboardPath(userRole);
      
      // Simple redirect without path checking to avoid unnecessary requests
      // and potential CORS issues with HEAD requests
      const redirect = () => {
        console.log('=== LOGIN REDIRECT DEBUGGING ===');
        console.log('User role:', userRole);
        console.log('Dashboard path:', dashboardPath);
        console.log('Current URL:', window.location.href);
        console.log('===============================');
        
        // Log a stack trace to see where the redirect is coming from
        console.trace('Redirect stack trace');
        
        // Use replaceState to prevent any redirect loops
        window.history.replaceState(null, '', dashboardPath);
        
        // Force a hard reload to ensure we don't have any cached redirects
        window.location.href = dashboardPath;
      };
      
      // Add a small delay to ensure the toast is visible
      console.log('Setting up redirect to:', dashboardPath);
      setTimeout(redirect, 1000);

    } catch (error: any) {
      console.log('Full error object:', error);
      console.log('Error response data:', error.response?.data);
      console.log('Error response status:', error.response?.status);
      
      let errorMessage = "Login failed. Please try again.";
      const responseData = error.response?.data;

      if (axios.isAxiosError(error)) {
        // Debug: Log the exact response structure
        console.log('Full error response:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          data: error.response?.data,
          keys: error.response?.data ? Object.keys(error.response.data) : []
        });

        // Check for email not found error (array format)
        if (Array.isArray(responseData?.email)) {
          errorMessage = responseData.email[0];
          console.log('Email error:', errorMessage);
        } 
        // Check for email not found error (string format)
        else if (typeof responseData?.email === 'string') {
          errorMessage = responseData.email;
          console.log('Email error (string):', errorMessage);
        }
        // Check for invalid password error (array format)
        else if (Array.isArray(responseData?.non_field_errors)) {
          errorMessage = responseData.non_field_errors[0];
          console.log('Password error:', errorMessage);
        }
        // Check for invalid password error (string format)
        else if (typeof responseData?.non_field_errors === 'string') {
          errorMessage = responseData.non_field_errors;
          console.log('Password error (string):', errorMessage);
        }
        // Check for direct message
        else if (typeof responseData === 'string') {
          errorMessage = responseData;
          console.log('Direct error message:', errorMessage);
        }
        // Check for 401 Unauthorized
        else if (error.response?.status === 401) {
          errorMessage = "Invalid email or password";
          console.log('401 Unauthorized error');
        } 
        // Check for rate limiting
        else if (error.response?.status === 429) {
          errorMessage = "Too many login attempts. Please try again later.";
          console.log('Rate limit error');
        } 
        // Check for other error formats
        else if (responseData?.detail) {
          errorMessage = typeof responseData.detail === 'string' 
            ? responseData.detail 
            : JSON.stringify(responseData.detail);
          console.log('Detail error:', errorMessage);
        } 
        else if (responseData?.message) {
          errorMessage = typeof responseData.message === 'string'
            ? responseData.message
            : JSON.stringify(responseData.message);
          console.log('Message error:', errorMessage);
        }
      }

      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mx-auto"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mx-auto"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 w-full max-w-md mx-auto">
      {/* Header Section */}
      <div className="text-center space-y-3 animate-in fade-in-50 duration-500">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-base">
          Sign in to your account to continue
        </p>
      </div>

      {/* Social Login Options */}
      {/* <div className="space-y-3 animate-in fade-in-50 duration-500 delay-100">
        <div className="grid grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            size="lg"
            className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            disabled={isLoading}
          >
            <Chrome className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            disabled={isLoading}
          >
            <Github className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="h-12 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            disabled={isLoading}
          >
            <Apple className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>
      </div> */}

      {/* Form Section */}

      <div className="animate-in fade-in-50 duration-500 delay-200">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...field}
                        disabled={isLoading}
                        className={cn(
                          "h-12 pl-4 pr-4 text-base border-2 transition-all duration-200",
                          "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                          "hover:border-gray-400 dark:hover:border-gray-600",
                          form.formState.errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        )}
                      />
                      {form.formState.errors.email && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...field}
                        disabled={isLoading}
                        className={cn(
                          "h-12 pl-4 pr-12 text-base border-2 transition-all duration-200",
                          "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                          "hover:border-gray-400 dark:hover:border-gray-600",
                          form.formState.errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-0 right-0 px-3 py-0 h-full hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-sm" />
                </FormItem>
              )}
            />

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                disabled={isLoading}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Remember me
              </label>
            </div>

            <Button 
              type="submit" 
              className={cn(
                "w-full h-12 text-base font-semibold transition-all duration-200",
                "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                "shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Footer */}
      <div className="text-center animate-in fade-in-50 duration-500 delay-300">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            href="/org/register"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;