"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/account";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">
          Đăng nhập BesideAI
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sử dụng tài khoản Google để kết nối Extension và Dashboard.
        </p>
        <div className="mt-6 space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            onClick={() => {
              // TODO: Implement real Google OAuth flow.
              // Tạm thời chỉ redirect user sang backend docs.
              window.location.href =
                "https://accounts.google.com/o/oauth2/v2/auth";
            }}
          >
            <span>Đăng nhập với Google</span>
          </button>
          <p className="text-xs text-zinc-500">
            Sau khi hoàn thiện OAuth, nút này sẽ chuyển hướng tới Google và trở
            lại trang: <code>{redirect}</code>.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
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
      <LoginContent />
    </Suspense>
  );
}


