"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

interface SubscriptionStatus {
  tier: string;
  status: string;
  billingCycle?: string | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
}

interface UsageSummary {
  tokens: number;
  requests: number;
  recordingTime: number;
  translationTime: number;
}

export default function AccountPage() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null,
  );
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setError("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [statusRes, usageRes] = await Promise.all([
          apiRequest<{
            success: boolean;
            subscription: {
              tier: string;
              status: string;
              billingCycle?: string | null;
              trialEndsAt?: string | null;
              subscriptionEndsAt?: string | null;
            };
          }>(
            "/subscription/status",
            { authToken: token },
          ),
          apiRequest<{ success: boolean; summary: UsageSummary }>(
            "/usage?period=month",
            { authToken: token },
          ),
        ]);

        if (statusRes.subscription) {
          setSubscription({
            tier: statusRes.subscription.tier,
            status: statusRes.subscription.status,
            billingCycle: statusRes.subscription.billingCycle,
            trialEndsAt: statusRes.subscription.trialEndsAt,
            subscriptionEndsAt: statusRes.subscription.subscriptionEndsAt,
          });
        }

        if (usageRes.summary) {
          setUsage(usageRes.summary);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Không thể tải dữ liệu subscription.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  async function handleUpgrade(tier: "professional" | "premium") {
    const token = getAuthToken();
    if (!token) return;
    try {
      setActionMessage(null);
      const res = await apiRequest<{
        success: boolean;
        checkoutUrl: string;
      }>("/subscription/upgrade", {
        method: "POST",
        authToken: token,
        body: JSON.stringify({ tier, billingCycle: "monthly" }),
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể tạo checkout session.";
      setActionMessage(message);
    }
  }

  async function handleCancel() {
    const token = getAuthToken();
    if (!token) return;
    try {
      setActionMessage(null);
      await apiRequest("/subscription/cancel", {
        method: "POST",
        authToken: token,
        body: JSON.stringify({ immediately: false }),
      });
      setActionMessage("Yêu cầu hủy gói đã được gửi. Gói sẽ hết hạn cuối kỳ.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể hủy gói.";
      setActionMessage(message);
    }
  }

  async function handlePortal() {
    const token = getAuthToken();
    if (!token) return;
    try {
      setActionMessage(null);
      const res = await apiRequest<{ success: boolean; portalUrl: string }>(
        "/subscription/portal",
        {
          method: "POST",
          authToken: token,
          body: JSON.stringify({}),
        },
      );
      if (res.portalUrl) {
        window.location.href = res.portalUrl;
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể mở trang quản lý subscription.";
      setActionMessage(message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Subscription của bạn
      </h1>

      {loading && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Đang tải dữ liệu subscription...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">
          Lỗi: {error}
        </p>
      )}

      {actionMessage && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {actionMessage}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Trạng thái gói hiện tại
          </h2>
          {subscription ? (
            <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                Tier: <strong>{subscription.tier}</strong>
              </p>
              <p>
                Status: <strong>{subscription.status}</strong>
              </p>
              {subscription.billingCycle && (
                <p>Billing: {subscription.billingCycle}</p>
              )}
              {subscription.subscriptionEndsAt && (
                <p>
                  Gia hạn tiếp theo:{" "}
                  {new Date(
                    subscription.subscriptionEndsAt,
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Chưa có dữ liệu subscription.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleUpgrade("professional")}
              className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              Nâng cấp lên Professional
            </button>
            <button
              type="button"
              onClick={() => handleUpgrade("premium")}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Nâng cấp lên Premium
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Hủy gói
            </button>
            <button
              type="button"
              onClick={handlePortal}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Quản lý subscription
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
            Usage (tháng này)
          </h2>
          {usage ? (
            <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Tokens dùng: {usage.tokens.toLocaleString()}</li>
              <li>Requests: {usage.requests.toLocaleString()}</li>
              <li>Recording time: {usage.recordingTime} phút</li>
              <li>Translation time: {usage.translationTime} phút</li>
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Chưa có dữ liệu usage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

