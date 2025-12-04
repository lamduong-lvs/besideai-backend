"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthToken } from "@/lib/auth";

/**
 * Google OAuth callback handler.
 * Receives authorization code from Google, exchanges it for token via backend,
 * saves token, and redirects to account page.
 */
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state"); // Contains redirect path or extension info
    const errorParam = searchParams.get("error");
    
    // Parse state (might be base64 encoded JSON for extension callbacks)
    let stateData = null;
    let redirect = "/account";
    let extensionCallback = null;
    let extensionId = null;
    let promiseId = null;
    
    if (stateParam) {
      try {
        // Try to parse as JSON (extension callback)
        stateData = JSON.parse(atob(stateParam));
        redirect = stateData.redirect || "/account";
        extensionCallback = stateData.extension_callback;
        extensionId = stateData.extension_id;
        promiseId = stateData.promise_id;
      } catch (e) {
        // Not JSON, treat as plain redirect path
        redirect = stateParam;
      }
    }

    // Handle OAuth errors
    if (errorParam) {
      setError(`Lỗi đăng nhập: ${errorParam}`);
      setTimeout(() => {
        router.replace("/login");
      }, 3000);
      return;
    }

    if (!code) {
      setError("Không nhận được authorization code từ Google.");
      setTimeout(() => {
        router.replace("/login");
      }, 3000);
      return;
    }

    // Exchange code for token via backend
    const exchangeCodeForToken = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://besideai-backend.vercel.app";
        const response = await fetch(`${apiUrl}/api/auth/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 
              `${window.location.origin}/callback`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to exchange code for token");
        }

        const data = await response.json();
        
        if (data.token) {
          // Check if this is an extension callback (from parsed state)
          if (extensionCallback && extensionId) {
            // Redirect to extension callback with token
            const callbackUrl = new URL(extensionCallback);
            callbackUrl.searchParams.set('token', data.token);
            if (promiseId) {
              callbackUrl.searchParams.set('promise_id', promiseId);
            }
            // Also preserve extension_callback and extension_id for callback.html
            callbackUrl.searchParams.set('extension_callback', extensionCallback);
            callbackUrl.searchParams.set('extension_id', extensionId);
            window.location.href = callbackUrl.toString();
            return;
          }
          
          // Normal web flow: Save token to localStorage
          setAuthToken(data.token);
          
          // Redirect to account page
          router.replace(redirect);
        } else {
          throw new Error("Token not received from backend");
        }
      } catch (err) {
        console.error("OAuth callback error:", err);
        setError(err instanceof Error ? err.message : "Lỗi khi xử lý đăng nhập.");
        setTimeout(() => {
          router.replace("/login");
        }, 3000);
      }
    };

    exchangeCodeForToken();
  }, [router, searchParams]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md rounded-2xl border border-destructive bg-destructive/10 p-8">
          <h2 className="text-xl font-semibold text-destructive mb-2">Lỗi đăng nhập</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">
            Đang chuyển hướng về trang đăng nhập...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">
          Đang xử lý đăng nhập... Vui lòng chờ trong giây lát.
        </p>
      </div>
    </main>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Đang tải...
          </p>
        </main>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}


