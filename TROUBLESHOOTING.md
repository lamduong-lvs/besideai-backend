# Troubleshooting Database Connection

## Lỗi: `getaddrinfo ENOTFOUND`

Nếu bạn gặp lỗi này khi test connection, có thể do một trong các nguyên nhân sau:

### 1. Supabase Project chưa được kích hoạt

**Kiểm tra:**
- Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
- Kiểm tra project status: Project phải ở trạng thái **Active** (không phải Paused)
- Nếu project bị Paused, click **Resume** để kích hoạt lại

### 2. Connection String không đúng

**Kiểm tra:**
- File `.env` có connection string đầy đủ trên một dòng
- Password đã được URL encode nếu chứa ký tự đặc biệt (`#` → `%23`)
- Format: `postgresql://postgres:PASSWORD@HOST:5432/postgres`

**Ví dụ:**
```env
# Password: Dv007009####
DATABASE_URL=postgresql://postgres:Dv007009%23%23%23%23@db.gvllnfqmddsqqjybxczz.supabase.co:5432/postgres
```

### 3. Network/Firewall Issues

**Kiểm tra:**
- Firewall có chặn port 5432 không
- VPN có ảnh hưởng đến kết nối không
- Thử từ một mạng khác (mobile hotspot)

**Test DNS:**
```powershell
nslookup db.gvllnfqmddsqqjybxczz.supabase.co
```

**Test Port:**
```powershell
Test-NetConnection -ComputerName db.gvllnfqmddsqqjybxczz.supabase.co -Port 5432
```

### 4. IPv6 vs IPv4

**Supabase chỉ hỗ trợ IPv6**, không có IPv4. Nếu bạn gặp lỗi `ENETUNREACH` khi test từ local:

**Nguyên nhân:**
- Windows local network có thể không hỗ trợ IPv6 hoặc không có route đến IPv6
- ISP/Router có thể chưa enable IPv6

**Giải pháp:**
1. **Deploy lên Vercel** (Khuyến nghị) - Vercel serverless functions chạy trên network có hỗ trợ IPv6 tốt
2. **Enable IPv6 trên Windows** (nếu có thể):
   ```powershell
   # Kiểm tra IPv6
   Get-NetAdapterBinding -ComponentID ms_tcpip6
   
   # Enable IPv6 nếu chưa enable
   Enable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6
   ```
3. **Sử dụng VPN có hỗ trợ IPv6**
4. **Chạy migrations từ Supabase SQL Editor** (tạm thời) trong khi chờ deploy Vercel

### 5. Supabase IP Whitelist

**Kiểm tra:**
- Supabase Dashboard → Settings → Database
- Xem có IP whitelist không
- Nếu có, thêm IP của bạn vào whitelist (hoặc tắt whitelist cho development)

## Giải pháp tạm thời

Nếu không thể kết nối từ local, bạn có thể:

1. **Deploy lên Vercel trước** - Vercel serverless functions thường kết nối được tốt hơn
2. **Sử dụng Supabase SQL Editor** - Chạy migrations trực tiếp từ Supabase Dashboard
3. **Kiểm tra Supabase Status** - Xem [status.supabase.com](https://status.supabase.com) có incident nào không

## Test Connection từ Vercel

Sau khi deploy lên Vercel, test connection bằng cách:
1. Vào Vercel Dashboard → Functions → Logs
2. Gọi endpoint `/api/health`
3. Xem logs để kiểm tra database connection

## Liên hệ Support

Nếu vẫn không giải quyết được:
1. Kiểm tra Supabase project logs
2. Kiểm tra Vercel function logs
3. Liên hệ Supabase support nếu cần

