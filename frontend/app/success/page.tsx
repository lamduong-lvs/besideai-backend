export default function SuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">
          Cảm ơn bạn đã đăng ký!
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Nếu thanh toán thành công, gói BesideAI của bạn sẽ được kích hoạt
          trong vài giây qua Lemon Squeezy webhook.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-sm">
          <a
            href="/account"
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Về trang Account
          </a>
          <a
            href="https://chrome.google.com/webstore"
            className="text-zinc-600 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Mở BesideAI Extension
          </a>
        </div>
      </div>
    </main>
  );
}


