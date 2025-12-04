"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAIPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const token = getAuthToken();
    if (!token) {
      setError("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
      return;
    }

    if (!message.trim()) {
      setError("Vui lòng nhập tin nhắn.");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await apiRequest<{
        success: boolean;
        content: string;
        model: string;
        provider: string;
        tokens?: {
          input: number;
          output: number;
          total: number;
        };
      }>("/ai/call", {
        method: "POST",
        authToken: token,
        body: JSON.stringify({
          model: "gpt-4o-mini", // Default model, can be changed
          messages: [
            {
              role: "user",
              content: message,
            },
          ],
          options: {
            temperature: 0.7,
            maxTokens: 2000,
            stream: false,
          },
        }),
      });

      if (result.success && result.content) {
        setResponse(result.content);
      } else {
        setError("Không nhận được phản hồi từ AI.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi gọi AI API.";
      setError(errorMessage);
      console.error("AI API error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Test AI API
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          Trang này để test gọi AI API từ frontend. Đảm bảo bạn đã đăng nhập.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gửi tin nhắn đến AI</CardTitle>
          <CardDescription>
            Nhập tin nhắn và nhấn "Gửi" để test AI API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="w-full min-h-[100px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="Nhập tin nhắn của bạn..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading}>
            {loading ? "Đang gửi..." : "Gửi"}
          </Button>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive font-medium">Lỗi:</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          )}

          {response && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-4">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Phản hồi từ AI:
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {response}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

