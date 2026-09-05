import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const safeStorage = {
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        // Only log warning once to avoid spamming
        console.warn('Storage quota exceeded, attempting to clear non-essential data...');
        
        try {
          // 1. Clear all non-essential data
          const keys = Object.keys(localStorage);
          for (const k of keys) {
            // Keep only the current user session and theme
            if (k !== 'snapy_user' && k !== 'theme') {
              localStorage.removeItem(k);
            }
          }
          
          // 2. Try saving again
          localStorage.setItem(key, value);
        } catch (e2) {
          // 3. If it still fails, the single item itself is too large
          if (key.startsWith('snapy_msgs_')) {
            try {
              const msgs = JSON.parse(value);
              if (Array.isArray(msgs)) {
                // Try very aggressive truncation (last 5 messages)
                if (msgs.length > 5) {
                  console.warn('Item still too large, truncating message cache to last 5 messages');
                  const truncated = JSON.stringify(msgs.slice(-5));
                  localStorage.setItem(key, truncated);
                  return;
                }
              }
            } catch (e3) {
              // Not JSON or other parse error
            }
          }
          // If we reach here, we simply cannot save this item. 
          // We fail silently to avoid console spamming in loops.
        }
      } else {
        console.error('Error saving to localStorage', e);
      }
    }
  },
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
};

export function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with quality compression
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}
