'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if the device is Android
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsAndroid(userAgent.includes('android'));

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show toast notification for installation
      if (userAgent.includes('android')) {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex items-center justify-between p-4`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Download className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    Install Receipt Scanner
                  </p>
                  <p className="text-sm text-gray-500">
                    Add to your home screen for easy access
                  </p>
                </div>
              </div>
              <div className="flex">
                <button
                  onClick={() => {
                    handleInstallClick();
                    toast.dismiss(t.id);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Install
                </button>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="ml-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  Later
                </button>
              </div>
            </div>
          ),
          {
            duration: 10000,
            position: 'bottom-center',
          }
        );
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        toast.success('Thank you for installing our app!');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error installing PWA:', error);
      toast.error('Failed to install. Please try again.');
    }
  };

  // This component doesn't render anything visible
  // It just handles the install prompt logic
  return null;
} 