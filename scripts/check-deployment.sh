#!/bin/bash

# Script để kiểm tra deployment status và logs
# Usage: ./scripts/check-deployment.sh [frontend|backend|all]

set -e

FRONTEND_URL="${FRONTEND_URL:-https://your-frontend-domain.vercel.app}"
BACKEND_URL="${BACKEND_URL:-https://besideai.work}"

check_frontend() {
    echo "🔍 Checking Frontend Deployment..."
    echo "=================================="
    
    # Check if frontend is accessible
    echo "1. Checking frontend accessibility..."
    if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200"; then
        echo "✅ Frontend is accessible"
    else
        echo "❌ Frontend is not accessible"
        return 1
    fi
    
    # Check login page
    echo "2. Checking login page..."
    if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/login" | grep -q "200"; then
        echo "✅ Login page is accessible"
    else
        echo "❌ Login page is not accessible"
    fi
    
    # Check callback page
    echo "3. Checking callback page..."
    if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/callback" | grep -q "200"; then
        echo "✅ Callback page is accessible"
    else
        echo "❌ Callback page is not accessible"
    fi
    
    echo ""
}

check_backend() {
    echo "🔍 Checking Backend Deployment..."
    echo "=================================="
    
    # Check health endpoint
    echo "1. Checking health endpoint..."
    HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/health")
    if echo "$HEALTH_RESPONSE" | grep -q "success"; then
        echo "✅ Health endpoint is working"
        echo "   Response: $HEALTH_RESPONSE"
    else
        echo "❌ Health endpoint is not working"
        echo "   Response: $HEALTH_RESPONSE"
    fi
    
    # Check OAuth callback endpoint (should return error without code, but endpoint should exist)
    echo "2. Checking OAuth callback endpoint..."
    CALLBACK_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/callback" \
        -H "Content-Type: application/json" \
        -d '{"code":"test"}')
    if echo "$CALLBACK_RESPONSE" | grep -q "invalid_request\|token_exchange_failed"; then
        echo "✅ OAuth callback endpoint exists (expected error without valid code)"
    else
        echo "⚠️  OAuth callback endpoint may have issues"
        echo "   Response: $CALLBACK_RESPONSE"
    fi
    
    # Check AI call endpoint (should return 401 without auth)
    echo "3. Checking AI call endpoint..."
    AI_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/ai/call" \
        -H "Content-Type: application/json" \
        -d '{"model":"test","messages":[]}')
    if echo "$AI_RESPONSE" | grep -q "unauthorized\|MISSING_TOKEN"; then
        echo "✅ AI call endpoint exists (expected 401 without auth)"
    else
        echo "⚠️  AI call endpoint may have issues"
        echo "   Response: $AI_RESPONSE"
    fi
    
    echo ""
}

check_env_vars() {
    echo "🔍 Checking Environment Variables..."
    echo "=================================="
    
    echo "⚠️  Note: This script cannot check Vercel environment variables directly."
    echo "   Please check manually in Vercel Dashboard:"
    echo "   - Frontend: Settings > Environment Variables"
    echo "   - Backend: Settings > Environment Variables"
    echo ""
    echo "Required Frontend Variables:"
    echo "  - NEXT_PUBLIC_API_URL"
    echo "  - NEXT_PUBLIC_GOOGLE_CLIENT_ID"
    echo "  - NEXT_PUBLIC_GOOGLE_REDIRECT_URI"
    echo ""
    echo "Required Backend Variables:"
    echo "  - GOOGLE_CLIENT_ID"
    echo "  - GOOGLE_CLIENT_SECRET"
    echo "  - GOOGLE_REDIRECT_URI"
    echo "  - CORS_ORIGIN"
    echo ""
}

main() {
    case "${1:-all}" in
        frontend)
            check_frontend
            ;;
        backend)
            check_backend
            ;;
        all)
            check_frontend
            check_backend
            check_env_vars
            ;;
        *)
            echo "Usage: $0 [frontend|backend|all]"
            exit 1
            ;;
    esac
    
    echo "✅ Deployment check completed!"
}

main "$@"

