"use client";

import Link from "next/link";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Bảng giá BesideAI
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Chọn gói phù hợp với nhu cầu của bạn. Tất cả gói đều có 7 ngày dùng
          thử miễn phí.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
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
          ctaText="Bắt đầu miễn phí"
          ctaHref="/login"
          highlight={false}
        />

        <PricingCard
          name="Professional"
          price="$9.99"
          period="tháng"
          yearlyPrice="$99.90"
          yearlyPeriod="năm (tiết kiệm ~17%)"
          description="Phù hợp cho cá nhân sử dụng thường xuyên"
          features={[
            "Giới hạn tokens cao (10M/tháng)",
            "Truy cập các model Pro (GPT-4o, Claude 3.5 Sonnet, ...)",
            "Ưu tiên tốc độ xử lý",
            "Hỗ trợ đầy đủ tính năng Extension",
            "7 ngày dùng thử miễn phí",
          ]}
          ctaText="Chọn Professional"
          ctaHref="/login"
          highlight={true}
        />

        <PricingCard
          name="Premium"
          price="$29.99"
          period="tháng"
          yearlyPrice="$299.90"
          yearlyPeriod="năm (tiết kiệm ~17%)"
          description="Dành cho power-users và team nhỏ"
          features={[
            "Giới hạn tokens rất cao (50M/tháng)",
            "Truy cập tất cả models cao cấp",
            "Ưu tiên tốc độ xử lý cao nhất",
            "Hỗ trợ ưu tiên qua email",
            "Tính năng nâng cao và beta",
            "7 ngày dùng thử miễn phí",
          ]}
          ctaText="Chọn Premium"
          ctaHref="/login"
          highlight={false}
        />
      </div>

      <div className="mt-16 rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-2xl font-semibold tracking-tight">
          Câu hỏi thường gặp
        </h2>
        <div className="mt-6 space-y-6">
          <FAQItem
            question="Tôi có thể hủy gói bất cứ lúc nào không?"
            answer="Có, bạn có thể hủy gói subscription bất cứ lúc nào. Gói sẽ tiếp tục hoạt động đến hết kỳ thanh toán hiện tại, sau đó sẽ tự động chuyển về Free tier."
          />
          <FAQItem
            question="Thanh toán được xử lý như thế nào?"
            answer="Thanh toán được xử lý an toàn qua Lemon Squeezy, một Merchant of Record uy tín hỗ trợ thanh toán quốc tế và xử lý thuế tự động. Chúng tôi không lưu trữ thông tin thẻ tín dụng của bạn."
          />
          <FAQItem
            question="Tôi có thể đổi gói không?"
            answer="Có, bạn có thể nâng cấp hoặc hạ cấp gói bất cứ lúc nào. Khi nâng cấp, bạn sẽ được tính phí prorated. Khi hạ cấp, thay đổi sẽ có hiệu lực vào kỳ thanh toán tiếp theo."
          />
          <FAQItem
            question="Dùng thử 7 ngày có tính phí không?"
            answer="Không, bạn có thể dùng thử miễn phí trong 7 ngày. Chúng tôi sẽ chỉ tính phí sau khi kỳ dùng thử kết thúc. Bạn có thể hủy bất cứ lúc nào trong thời gian dùng thử."
          />
          <FAQItem
            question="BesideAI hỗ trợ những nền tảng nào?"
            answer="Hiện tại BesideAI là một Chrome Extension hoạt động trên Google Chrome và các trình duyệt Chromium (Edge, Brave, ...). Chúng tôi đang phát triển hỗ trợ cho các trình duyệt khác."
          />
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Có câu hỏi khác?{" "}
          <Link
            href="mailto:support@besideai.work"
            className="font-semibold text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
          >
            Liên hệ chúng tôi
          </Link>
        </p>
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  period,
  yearlyPrice,
  yearlyPeriod,
  description,
  features,
  ctaText,
  ctaHref,
  highlight,
}: {
  name: string;
  price: string;
  period: string;
  yearlyPrice?: string;
  yearlyPeriod?: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${
        highlight
          ? "border-zinc-900 bg-zinc-900 text-white shadow-lg dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <div className="flex-1">
        <h3 className="text-xl font-semibold">{name}</h3>
        <div className="mt-2">
          <span className="text-3xl font-semibold">{price}</span>
          <span className="ml-1 text-sm opacity-70">/{period}</span>
        </div>
        {yearlyPrice && yearlyPeriod && (
          <div className="mt-1">
            <span className="text-lg font-semibold">{yearlyPrice}</span>
            <span className="ml-1 text-xs opacity-70">/{yearlyPeriod}</span>
          </div>
        )}
        <p
          className={`mt-3 text-sm ${
            highlight
              ? "text-zinc-300 dark:text-zinc-700"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {description}
        </p>
        <ul className="mt-6 space-y-2">
          {features.map((feature, idx) => (
            <li
              key={idx}
              className={`flex items-start text-sm ${
                highlight
                  ? "text-zinc-200 dark:text-zinc-800"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className="mr-2">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={ctaHref}
        className={`mt-6 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
          highlight
            ? "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            : "bg-black text-white hover:bg-zinc-800"
        }`}
      >
        {ctaText}
      </Link>
    </div>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {question}
      </h3>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {answer}
      </p>
    </div>
  );
}

