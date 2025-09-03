"use client";

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface ServerNotification {
  id: number;
  user_id: string;
  type: string;
  message: string;
  data: {
    guildId: string;
    guildName: string;
    timestamp: string;
  };
  created_at: string;
  read_at: string | null;
}

export function SoundNotification() {
  const { data: session } = useSession();
  const [audioContextState, setAudioContextState] = useState<'suspended' | 'running' | 'closed'>('suspended');
  const audioContextRef = useRef<AudioContext | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [playedNotifications, setPlayedNotifications] = useState<Set<number>>(new Set());

  // Initialize audio context on mount
  useEffect(() => {
    const initAudioContext = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext && !audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          setAudioContextState(audioContextRef.current.state);

          // Listen for state changes
          audioContextRef.current.onstatechange = () => {
            setAudioContextState(audioContextRef.current?.state || 'closed');
          };
        }
      } catch (error) {
        console.warn('Could not initialize audio context');
      }
    };

    initAudioContext();
  }, []);

  // Handle user interaction to resume audio context
  useEffect(() => {
    const resumeAudioContext = async () => {
      if (!audioContextRef.current || userInteracted) return;

      try {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          setUserInteracted(true);
        }
      } catch (error) {
        console.warn('Could not resume audio context');
      }
    };

    // Add event listeners for user interaction
    const handleUserInteraction = () => {
      resumeAudioContext();
    };

    // Add listeners to document for broader interaction capture
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [userInteracted]);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Check for new server notifications
    const checkNotifications = async () => {
      try {
        const response = await fetch('/api/user/notifications');

        if (!response.ok) {
          console.warn('Failed to fetch notifications');
          return;
        }

        const notifications: ServerNotification[] = await response.json();

        const newServerNotifications = notifications.filter(
          n => n.type === 'new_server' && !n.read_at && !playedNotifications.has(n.id)
        );

        if (newServerNotifications.length > 0) {
          // Wait for user interaction if audio context is suspended
          if (audioContextState === 'suspended' && !userInteracted) {
            // Retry after a short delay
            setTimeout(() => checkNotifications(), 1000);
            return;
          }

          // Play success sound
          const soundPlayed = await playSuccessSound();

          if (soundPlayed) {
            // Mark notifications as read only if sound was successfully played
            await markNotificationsRead(newServerNotifications.map(n => n.id));

            // Track which notifications we've played sound for
            setPlayedNotifications(prev => {
              const newSet = new Set(prev);
              newServerNotifications.forEach(n => newSet.add(n.id));
              return newSet;
            });
          } else {
            // Don't mark as played, will retry later
          }
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Initial delay to ensure page is fully loaded
    const timer = setTimeout(checkNotifications, 2000);

    // Set up periodic checking for new notifications
    const interval = setInterval(checkNotifications, 5000); // Check every 5 seconds

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [session, playedNotifications, audioContextState, userInteracted]);

  const playSuccessSound = async (): Promise<boolean> => {
    try {
      // Use the shared audio context
      if (!audioContextRef.current) {
        await fallbackBeep();
        return false;
      }

      const audioContext = audioContextRef.current;

      // Ensure audio context is running
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
        } catch (resumeErr) {
          await fallbackBeep();
          return false;
        }
      }

      if (audioContext.state === 'running') {
        await playOscillatorSound(audioContext);
        return true;
      } else {
        await fallbackBeep();
        return false;
      }

    } catch (error) {
      await fallbackBeep();
      return false;
    }
  };

  const playOscillatorSound = async (audioContext: AudioContext): Promise<boolean> => {
    try {
      // Create a pleasant "success" sound using oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Pleasant ascending tone
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Clean up after sound finishes
      setTimeout(() => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 600);

      return true;

    } catch (error) {
      await fallbackBeep();
      return false;
    }
  };

  const fallbackBeep = async (): Promise<boolean> => {
    try {
      // Try to create a simple beep sound
      const audio = new Audio();
      audio.volume = 0.3;

      // Create a data URL for a simple beep
      const sampleRate = 44100;
      const duration = 0.5;
      const numSamples = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      // Generate ascending tone
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const frequency = 523.25 + (783.99 - 523.25) * (t / duration); // C5 to G5
        const sample = Math.sin(2 * Math.PI * frequency * t) * 32767 * Math.exp(-t * 2); // Fade out
        view.setInt16(44 + i * 2, sample, true);
      }

      audio.src = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));

      await audio.play();
      return true;
    } catch (error) {
      // Last resort: show alert
      alert('🔔 New server notification!');
      return false;
    }
  };

  const markNotificationsRead = async (notificationIds: number[]) => {
    try {
      await fetch('/api/user/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 pointer-events-none"
      style={{ opacity: 0.7 }}
    >
      {audioContextState === 'running' ? (
        <div className="bg-green-500 text-white px-2 py-1 rounded text-xs">
          🔊 Audio Ready
        </div>
      ) : audioContextState === 'suspended' ? (
        <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs">
          🎵 Click to Enable Audio
        </div>
      ) : (
        <div className="bg-red-500 text-white px-2 py-1 rounded text-xs">
          🔇 Audio Unavailable
        </div>
      )}
    </div>
  );
}
