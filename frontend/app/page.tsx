import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
            <Button asChild size="lg">
              <Link href="/login">Bắt đầu miễn phí</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">Xem bảng giá</Link>
            </Button>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
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
    <Card className="flex flex-col justify-between">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <div className="text-2xl font-semibold">{price}</div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start">
              <span className="mr-2">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <div className="p-6 pt-0">
        <Button asChild className="w-full">
          <Link href="/login">Chọn gói {name}</Link>
        </Button>
      </div>
    </Card>
  );
}
