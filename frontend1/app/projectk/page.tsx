'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, CheckCircle, ArrowRight } from 'lucide-react';
import { fetchSubscriptionPlans, fetchPlanDurations, registerOrganization } from '@/services/subscriptionService';
import type { SubscriptionPlan, PlanDuration } from '@/types/subscription';

export default function ProjectKPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [durations, setDurations] = useState<Record<number, PlanDuration[]>>({});
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadPlans = async () => {
      try {
        // Fetch subscription plans
        const { data: plansData, error: plansError } = await fetchSubscriptionPlans();
        
        if (!isMounted) return;
        
        if (plansError) {
          console.error('Error loading subscription plans:', plansError);
          setError(plansError);
          setIsLoading(false);
          return;
        }
        
        if (!plansData || plansData.length === 0) {
          const errorMsg = 'No subscription plans are currently available. Please contact support.';
          console.error(errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          return;
        }
        
        setPlans(plansData);
        
        // Load durations for each plan
        const durationsMap: Record<string, PlanDuration[]> = {};
        let hasValidPlan = false;
        
        for (const plan of plansData) {
          const { data: durationsData, error: durationsError } = await fetchPlanDurations(plan.id);
          
          if (!isMounted) return;
          
          if (durationsError) {
            console.error(`Error loading durations for plan ${plan.id}:`, durationsError);
            continue; // Skip this plan but continue with others
          }
          
          if (durationsData && durationsData.length > 0) {
            durationsMap[plan.id] = durationsData;
            
            // Auto-select the first valid plan and its default duration
            if (!hasValidPlan) {
              const defaultDuration = durationsData.find(d => d.is_default) || durationsData[0];
              if (defaultDuration) {
                setSelectedPlan(plan.id);
                setSelectedDuration(defaultDuration.id); // Removed Number() since ID is now a string
                hasValidPlan = true;
              }
            }
          }
        }
        
        if (Object.keys(durationsMap).length === 0) {
          const errorMsg = 'No valid billing cycles found for any subscription plan. Please contact support.';
          console.error(errorMsg);
          setError(errorMsg);
        } else {
          setDurations(durationsMap);
        }
      } catch (err) {
        console.error('Unexpected error loading subscription data:', err);
        if (isMounted) {
          setError('An unexpected error occurred while loading subscription information. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPlans();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle plan selection
  const handlePlanSelect = (planId: number) => {
    setSelectedPlan(planId);
    const planDurations = durations[planId] || [];
    setSelectedDuration(planDurations[0]?.id || null);
  };

  // Handle duration selection
  const handleDurationSelect = (durationId: number) => {
    setSelectedDuration(durationId);
  };

  const handleGetStarted = () => {
    // Redirect to organization registration page with selected plan and duration
    if (selectedPlan !== null && selectedDuration !== null) {
      router.push(`/org/register?plan=${selectedPlan}&duration=${selectedDuration}`);
    } else {
      // If no plan/duration selected, go to organization registration page
      router.push('/org/register');
    }
  };

  const formatPrice = (price: string | number) => {
    // Convert string to number if needed
    const priceNumber = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceNumber);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            The Complete Solution for Your Business
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Select a paid plan for more features.
          </p>
          
          <div className="flex justify-center space-x-4 mb-16">
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
            <Button size="lg" onClick={handleGetStarted}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing</h2>
          
          <Tabs defaultValue="monthly" className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-12">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annually">Annually (Save 20%)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="monthly">
              <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={`transition-all duration-200 ${
                      selectedPlan === plan.id ? 'border-primary shadow-lg scale-105' : 'hover:shadow-md'
                    }`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <span className="text-4xl font-bold">
                          {plan.durations.length > 0 
                            ? formatPrice(plan.durations[0].price)
                            : 'Free'}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      
                      <ul className="space-y-3">
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Up to 10 users</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Basic analytics</span>
                        </li>
                        <li className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-2" />
                          <span>Email support</span>
                        </li>
                        {plan.name === 'Pro' || plan.name === 'Enterprise' ? (
                          <li className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                            <span>Advanced analytics</span>
                          </li>
                        ) : null}
                        {plan.name === 'Enterprise' ? (
                          <li className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                            <span>Priority support</span>
                          </li>
                        ) : null}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        variant={selectedPlan === plan.id ? 'default' : 'outline'}
                        onClick={handleGetStarted}
                      >
                        {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="annually">
              <div className="text-center text-muted-foreground mb-8">
                Save 20% with annual billing
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {plans.map((plan) => {
                  const price = plan.durations.length > 0 ? plan.durations[0].price : 0;
                  const priceNumber = typeof price === 'string' ? parseFloat(price) : price;
                  const annualPrice = priceNumber * 12 * 0.8; // 20% discount for annual
                  
                  return (
                    <Card 
                      key={plan.id} 
                      className={`transition-all duration-200 ${
                        selectedPlan === plan.id ? 'border-primary shadow-lg scale-105' : 'hover:shadow-md'
                      }`}
                      onClick={() => handlePlanSelect(plan.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-6">
                          <span className="text-4xl font-bold">
                            {formatPrice(annualPrice)}
                          </span>
                          <span className="text-muted-foreground">/year</span>
                          <div className="text-sm text-muted-foreground">
                            Billed annually (save 20%)
                          </div>
                        </div>
                        
                        <ul className="space-y-3">
                          <li className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                            <span>Up to 10 users</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                            <span>Basic analytics</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                            <span>Email support</span>
                          </li>
                          {plan.name === 'Pro' || plan.name === 'Enterprise' ? (
                            <li className="flex items-center">
                              <Check className="h-5 w-5 text-green-500 mr-2" />
                              <span>Advanced analytics</span>
                            </li>
                          ) : null}
                          {plan.name === 'Enterprise' ? (
                            <li className="flex items-center">
                              <Check className="h-5 w-5 text-green-500 mr-2" />
                              <span>Priority support</span>
                            </li>
                          ) : null}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          className="w-full" 
                          variant={selectedPlan === plan.id ? 'default' : 'outline'}
                          onClick={handleGetStarted}
                        >
                          {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Succeed</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'Easy to Use',
                description: 'Intuitive interface that makes it easy to get started and be productive right away.'
              },
              {
                title: 'Powerful Features',
                description: 'All the tools you need to manage your business efficiently and effectively.'
              },
              {
                title: 'Reliable Support',
                description: 'Our team is here to help you every step of the way with 24/7 support.'
              }
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 bg-background rounded-lg shadow-sm">
                <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of businesses that trust us to help them grow.
          </p>
          <Button size="lg" onClick={handleGetStarted}>
            Get Started Now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
