import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-12">
      <section className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            AI trợ lý cho Gmail, Meet và hơn thế nữa.
          </h1>
          <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            BesideAI kết nối Chrome Extension với backend AI mạnh mẽ, quản lý
            gói trả phí qua Lemon Squeezy và tối ưu chi phí Free Tier.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Bắt đầu miễn phí
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-zinc-300 px-6 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Xem bảng giá
            </Link>
          </div>
        </div>
      </section>

      <section id="features" className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Tính năng</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Chrome Extension mạnh mẽ"
            description="Tích hợp sâu với Gmail, Google Meet, PDF, screenshot và nhiều hơn nữa."
          />
          <FeatureCard
            title="Backend bảo mật"
            description="API keys AI được quản lý hoàn toàn phía server, không lộ trên client."
          />
          <FeatureCard
            title="Subscription linh hoạt"
            description="Thanh toán qua Lemon Squeezy, hỗ trợ Việt Nam, nhiều gói linh hoạt."
          />
        </div>
      </section>

      <section id="pricing" className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Bảng giá</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <PricingCard
            name="Professional"
            price="$9.99/tháng"
            description="Phù hợp cho cá nhân sử dụng thường xuyên."
            features={[
              "Giới hạn tokens cao",
              "Các model Pro (GPT-4o, Claude 3.5, ...)",
              "Ưu tiên tốc độ xử lý",
            ]}
          />
          <PricingCard
            name="Premium"
            price="$29.99/tháng"
            description="Dành cho power-users và team nhỏ."
            features={[
              "Giới hạn tokens rất cao",
              "Truy cập tất cả models cao cấp",
              "Hỗ trợ ưu tiên",
            ]}
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="mt-1 text-2xl font-semibold">{price}</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
        <ul className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      </div>
      <Link
        href="/login"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
      >
        Chọn gói {name}
      </Link>
    </div>
  );
}
