"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Placeholder cho Google OAuth callback.
 * Sau khi có backend OAuth endpoint, trang này sẽ:
 *  - Nhận ?code= từ Google
 *  - Gửi code lên backend để đổi token
 *  - Lưu token (cookie/localStorage)
 *  - Redirect sang /account
 */
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const redirect = searchParams.get("redirect") || "/account";

    if (!code) {
      router.replace("/login");
      return;
    }

    // TODO: Gửi code lên backend để exchange token và lưu auth token.
    router.replace(redirect);
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Đang xử lý đăng nhập... Vui lòng chờ trong giây lát.
      </p>
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


