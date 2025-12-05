"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * OAuth Test Page
 * Test OAuth configuration and flow from browser console
 */
export default function TestOAuthPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBackendConfig = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://besideai-backend.vercel.app";
      const response = await fetch(`${backendUrl}/api/auth/test-config`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setTestResult({
        type: "backend_config",
        status: response.status,
        data: data,
      });
    } catch (error) {
      setTestResult({
        type: "backend_config",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const testFrontendConfig = () => {
    const config = {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${window.location.origin}/callback`,
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || "https://besideai-backend.vercel.app",
      origin: window.location.origin,
    };

    setTestResult({
      type: "frontend_config",
      data: config,
    });
  };

  const generateTestCode = () => {
    const code = `
// ============================================
// OAuth Test Code - Copy and paste into browser console
// ============================================

async function testOAuthConfig() {
  console.log('=== Testing OAuth Configuration ===');
  
  // 1. Test Frontend Config
  console.log('\\n1. Frontend Config:');
  console.log({
    clientId: '${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "NOT_SET"}',
    redirectUri: '${process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || window.location.origin + "/callback"}',
    backendUrl: '${process.env.NEXT_PUBLIC_BACKEND_URL || "https://besideai-backend.vercel.app"}',
    origin: window.location.origin
  });
  
  // 2. Test Backend Config
  console.log('\\n2. Backend Config:');
  try {
    const backendUrl = '${process.env.NEXT_PUBLIC_BACKEND_URL || "https://besideai-backend.vercel.app"}';
    const response = await fetch(backendUrl + '/api/auth/test-config');
    const data = await response.json();
    console.log('Backend config:', data);
  } catch (error) {
    console.error('Backend config error:', error);
  }
  
  // 3. Test OAuth URL Generation
  console.log('\\n3. OAuth URL Generation:');
  const clientId = '${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "NOT_SET"}';
  const redirectUri = '${process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || window.location.origin + "/callback"}';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });
  const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  console.log('OAuth URL:', oauthUrl);
  console.log('\\nParameters:');
  console.log(Array.from(params.entries()));
  
  // 4. Check Google Cloud Console Requirements
  console.log('\\n4. Google Cloud Console Requirements:');
  console.log('Authorized JavaScript origins should include:');
  console.log('  -', window.location.origin);
  console.log('  - https://besideai.work');
  console.log('  - https://www.besideai.work');
  console.log('\\nAuthorized redirect URIs should include:');
  console.log('  -', redirectUri);
  console.log('  - https://besideai.work/callback');
  console.log('  - https://www.besideai.work/callback');
  
  return {
    frontend: {
      clientId: clientId,
      redirectUri: redirectUri
    },
    oauthUrl: oauthUrl
  };
}

// Run the test
testOAuthConfig().then(result => {
  console.log('\\n=== Test Complete ===');
  console.log('Result:', result);
});

// Also expose function globally for manual testing
window.testOAuthConfig = testOAuthConfig;
`;
    return code;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">OAuth Configuration Test</h1>
        <p className="text-muted-foreground mt-2">
          Test OAuth configuration and debug login issues
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Backend Config</CardTitle>
            <CardDescription>Test backend OAuth configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testBackendConfig} disabled={loading}>
              {loading ? "Testing..." : "Test Backend Config"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frontend Config</CardTitle>
            <CardDescription>Show frontend OAuth configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testFrontendConfig} disabled={loading}>
              Test Frontend Config
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Browser Console Test Code</CardTitle>
          <CardDescription>
            Copy this code and paste into browser console to test OAuth flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
            <code>{generateTestCode()}</code>
          </pre>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(generateTestCode());
              alert("Code copied to clipboard!");
            }}
          >
            Copy to Clipboard
          </Button>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              <code>{JSON.stringify(testResult, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

