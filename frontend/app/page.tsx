import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Zap, Shield, Globe, Mail, Video, FileText, Image } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 py-16">
      {/* Hero Section */}
      <section className="flex flex-col items-center gap-8 text-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI-Powered Chrome Extension</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            AI trợ lý cho{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Gmail, Meet
            </span>{" "}
            và hơn thế nữa
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            BesideAI kết nối Chrome Extension với backend AI mạnh mẽ, quản lý
            gói trả phí qua Lemon Squeezy và tối ưu chi phí Free Tier.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/login">Bắt đầu miễn phí</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
              <Link href="/pricing">Xem bảng giá</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Tính năng nổi bật</h2>
          <p className="text-muted-foreground">
            Tất cả những gì bạn cần để làm việc hiệu quả hơn với AI
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Mail className="h-6 w-6" />}
            title="Gmail Integration"
            description="Tích hợp sâu với Gmail để xử lý email thông minh và nhanh chóng."
          />
          <FeatureCard
            icon={<Video className="h-6 w-6" />}
            title="Google Meet"
            description="Hỗ trợ Google Meet với transcription và AI-powered insights."
          />
          <FeatureCard
            icon={<FileText className="h-6 w-6" />}
            title="PDF & Documents"
            description="Xử lý PDF, Word, Excel và nhiều định dạng tài liệu khác."
          />
          <FeatureCard
            icon={<Image className="h-6 w-6" />}
            title="Screenshot Analysis"
            description="Phân tích screenshot và hình ảnh với AI vision models."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Tốc độ cao"
            description="Xử lý nhanh chóng với backend được tối ưu và caching thông minh."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Bảo mật tuyệt đối"
            description="API keys được quản lý hoàn toàn phía server, không lộ trên client."
          />
          <FeatureCard
            icon={<Globe className="h-6 w-6" />}
            title="Đa ngôn ngữ"
            description="Hỗ trợ dịch và xử lý nhiều ngôn ngữ khác nhau."
          />
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            title="AI Models đa dạng"
            description="Truy cập GPT-4o, Claude 3.5, Gemini và nhiều models khác."
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Bảng giá</h2>
          <p className="text-muted-foreground">
            Chọn gói phù hợp với nhu cầu của bạn
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
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
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardContent>
    </Card>
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
