import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/icons";

export const metadata = {
  title: "Bảng giá",
};

export default function PricingPage() {
  return (
    <section className="container flex flex-col gap-6 py-8 md:max-w-[64rem] md:py-12 lg:py-24">
      <div className="mx-auto flex w-full flex-col gap-4 md:max-w-[58rem]">
        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
          Simple, transparent pricing
        </h2>
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
          Chọn gói phù hợp với nhu cầu của bạn. Tất cả gói đều có 7 ngày dùng
          thử miễn phí.
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
            "Truy cập các model Pro (GPT-4o, Claude 3.5, ...)",
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
      <div className="mx-auto flex w-full max-w-[58rem] flex-col gap-4">
        <p className="max-w-[85%] leading-normal text-muted-foreground sm:leading-7">
          BesideAI là một demo app.{" "}
          <strong>Bạn có thể test upgrade và sẽ không bị tính phí.</strong>
        </p>
      </div>
    </section>
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
      className={cn(
        "flex flex-col transition-all",
        highlight
          ? "border-primary shadow-lg scale-105"
          : "hover:shadow-lg"
      )}
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
              <Icons.check className="mt-0.5 h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm">{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <div className="p-6 pt-0">
        <Link
          href="/login"
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full",
            !highlight && buttonVariants({ variant: "outline" })
          )}
        >
          Chọn gói {name}
        </Link>
      </div>
    </Card>
  );
}
