import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import AuthWrapper from '../components/AuthWrapper';
import LandingPage from '../components/LandingPage';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Handle Stripe redirect results
    const handleStripeSuccess = async () => {
      if (router.query.success && router.query.plan) {
        console.log('🎉 Payment success detected, plan:', router.query.plan);
        
        // Wait for auth to be ready
        const waitForAuth = () => {
          return new Promise((resolve) => {
            if (auth.currentUser) {
              resolve(auth.currentUser);
            } else {
              const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                  unsubscribe();
                  resolve(user);
                }
              });
              
              // Timeout after 5 seconds
              setTimeout(() => {
                unsubscribe();
                resolve(null);
              }, 5000);
            }
          });
        };
        
        try {
          const currentUser = await waitForAuth();
          console.log('👤 Current user:', currentUser?.email);
          
          if (currentUser) {
            console.log('💾 Updating Firebase with premium status...');
            
            await updateDoc(doc(db, 'users', currentUser.uid), {
              subscriptionStatus: 'active',
              plan: router.query.plan,
              subscriptionDate: new Date().toISOString(),
              hasAcceptedTrial: true, // Also mark trial as accepted
              updatedAt: new Date().toISOString()
            });
            
            console.log('✅ Firebase updated successfully!');
            alert('Payment successful! Premium features unlocked!');
          } else {
            console.error('❌ No authenticated user found');
            alert('Payment successful! Please refresh the page if premium features don\'t appear.');
          }
        } catch (error) {
          console.error('❌ Error updating subscription:', error);
          alert('Payment successful! Please refresh the page if premium features don\'t appear.');
        }
        
        // Clean URL after a short delay to ensure update completes
        setTimeout(() => {
          router.replace('/', undefined, { shallow: true });
        }, 2000);
      }
      
      if (router.query.cancelled) {
        alert('Payment cancelled. You can upgrade anytime!');
        router.replace('/', undefined, { shallow: true });
      }
    };

    // Only run if we have query parameters
    if (router.query.success || router.query.cancelled) {
      handleStripeSuccess();
    }
  }, [router.query, router]);

  return (
    <AuthWrapper>
      {({ user }) => (
        <div className="min-h-screen bg-white">
          {!user ? (
            <LandingPage />
          ) : (
            <Dashboard user={user} />
          )}
        </div>
      )}
    </AuthWrapper>
  );
}