export default function Home() {
  return (
    // Tạm thời redirect logic landing page sang (marketing) group.
    // Thực tế UI sẽ nằm ở app/(marketing)/page.tsx.
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-lg text-foreground">
        BesideAI frontend is initializing... Landing page sẽ được triển khai
        tại nhóm route <code>(marketing)</code>.
      </p>
    </main>
  );
}
