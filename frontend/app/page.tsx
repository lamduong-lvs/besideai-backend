import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, Shield, Globe, Mail, Video, FileText, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center">
          <Link
            href="#"
            className="rounded-2xl bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Sparkles className="mr-2 inline h-4 w-4 text-primary" />
            AI-Powered Chrome Extension
          </Link>
          <h1 className="font-heading text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
            AI trợ lý cho{" "}
            <span className="bg-gradient-to-r from-primary via-primary/90 to-primary/60 bg-clip-text text-transparent">
              Gmail, Meet
            </span>{" "}
            và hơn thế nữa
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            BesideAI kết nối Chrome Extension với backend AI mạnh mẽ, quản lý
            gói trả phí qua Lemon Squeezy và tối ưu chi phí Free Tier.
          </p>
          <div className="space-x-4">
            <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Bắt đầu miễn phí
            </Link>
            <Link
              href="/pricing"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Xem bảng giá
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="container space-y-6 bg-slate-50 py-8 dark:bg-transparent md:py-12 lg:py-24"
      >
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Tính năng nổi bật
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Tất cả những gì bạn cần để làm việc hiệu quả hơn với AI
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-4">
          <FeatureCard
            icon={<Mail className="h-6 w-6 text-primary" />}
            title="Gmail Integration"
            description="Tích hợp sâu với Gmail để xử lý email thông minh và nhanh chóng."
          />
          <FeatureCard
            icon={<Video className="h-6 w-6 text-primary" />}
            title="Google Meet"
            description="Hỗ trợ Google Meet với transcription và AI-powered insights."
          />
          <FeatureCard
            icon={<FileText className="h-6 w-6 text-primary" />}
            title="PDF & Documents"
            description="Xử lý PDF, Word, Excel và nhiều định dạng tài liệu khác."
          />
          <FeatureCard
            icon={<Image className="h-6 w-6 text-primary" />}
            title="Screenshot Analysis"
            description="Phân tích screenshot và hình ảnh với AI vision models."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6 text-primary" />}
            title="Tốc độ cao"
            description="Xử lý nhanh chóng với backend được tối ưu và caching thông minh."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6 text-primary" />}
            title="Bảo mật tuyệt đối"
            description="API keys được quản lý hoàn toàn phía server, không lộ trên client."
          />
          <FeatureCard
            icon={<Globe className="h-6 w-6 text-primary" />}
            title="Đa ngôn ngữ"
            description="Hỗ trợ dịch và xử lý nhiều ngôn ngữ khác nhau."
          />
          <FeatureCard
            icon={<Sparkles className="h-6 w-6 text-primary" />}
            title="AI Models đa dạng"
            description="Truy cập GPT-4o, Claude 3.5, Gemini và nhiều models khác."
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Bảng giá
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Chọn gói phù hợp với nhu cầu của bạn
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <PricingCard
            name="Free"
            price="$0"
            period="miễn phí"
            description="Dành cho người dùng mới bắt đầu"
            features={[
              "Giới hạn tokens cơ bản",
              "Truy cập các model miễn phí",
              "Hỗ trợ Chrome Extension",
              "Sử dụng cơ bản Gmail, Meet, PDF",
            ]}
            highlight={false}
          />
          <PricingCard
            name="Professional"
            price="$9.99"
            period="tháng"
            description="Phù hợp cho cá nhân sử dụng thường xuyên"
            features={[
              "Giới hạn tokens cao (10M/tháng)",
              "Các model Pro (GPT-4o, Claude 3.5, ...)",
              "Ưu tiên tốc độ xử lý",
              "Hỗ trợ đầy đủ tính năng Extension",
              "7 ngày dùng thử miễn phí",
            ]}
            highlight={true}
          />
          <PricingCard
            name="Premium"
            price="$29.99"
            period="tháng"
            description="Dành cho power-users và team nhỏ"
            features={[
              "Giới hạn tokens rất cao (50M/tháng)",
              "Truy cập tất cả models cao cấp",
              "Ưu tiên tốc độ xử lý cao nhất",
              "Hỗ trợ ưu tiên qua email",
              "Tính năng nâng cao và beta",
              "7 ngày dùng thử miễn phí",
            ]}
            highlight={false}
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-background p-2 hover:border-primary/40 hover:shadow-md transition-all">
      <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
        <div className="mb-4">{icon}</div>
        <div className="space-y-2">
          <h3 className="font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlight,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <Card
      className={`flex flex-col justify-between transition-all ${
        highlight
          ? "border-primary shadow-lg scale-105"
          : "hover:shadow-lg"
      }`}
    >
      <CardHeader>
        {highlight && (
          <div className="mb-2 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Phổ biến nhất
          </div>
        )}
        <CardTitle className="text-2xl">{name}</CardTitle>
        <div className="mt-2">
          <span className="text-4xl font-bold">{price}</span>
          {period && (
            <span className="ml-2 text-muted-foreground">/{period}</span>
          )}
        </div>
        <CardDescription className="mt-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">✓</span>
              <span className="text-sm">{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <div className="p-6 pt-0">
        <Button
          asChild
          className={`w-full ${highlight ? "" : "variant-outline"}`}
          variant={highlight ? "default" : "outline"}
        >
          <Link href="/login">Chọn gói {name}</Link>
        </Button>
      </div>
    </Card>
  );
}
