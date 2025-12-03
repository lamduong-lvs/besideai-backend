export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>
      <div className="prose prose-sm mt-6 max-w-none text-zinc-700 dark:prose-invert dark:text-zinc-300">
        <section className="mt-6">
          <h2 className="text-xl font-semibold">1. Giới thiệu</h2>
          <p className="mt-2">
            BesideAI ("chúng tôi", "của chúng tôi", hoặc "dịch vụ") cam kết bảo
            vệ quyền riêng tư của bạn. Chính sách quyền riêng tư này mô tả cách
            chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin cá nhân của
            bạn khi bạn sử dụng dịch vụ BesideAI.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">2. Thông tin chúng tôi thu thập</h2>
          <h3 className="mt-3 text-lg font-semibold">2.1. Thông tin bạn cung cấp</h3>
          <ul className="mt-2 list-disc pl-6">
            <li>
              <strong>Thông tin tài khoản:</strong> Khi bạn đăng ký, chúng tôi
              có thể thu thập thông tin như tên, email, và ảnh đại diện từ tài
              khoản Google của bạn (nếu bạn đăng nhập qua Google OAuth)
            </li>
            <li>
              <strong>Thông tin thanh toán:</strong> Khi bạn đăng ký gói trả
              phí, thông tin thanh toán được xử lý bởi Lemon Squeezy (Merchant
              of Record). Chúng tôi không lưu trữ thông tin thẻ tín dụng của
              bạn
            </li>
          </ul>

          <h3 className="mt-3 text-lg font-semibold">2.2. Thông tin tự động thu thập</h3>
          <ul className="mt-2 list-disc pl-6">
            <li>
              <strong>Dữ liệu sử dụng:</strong> Chúng tôi thu thập thông tin về
              cách bạn sử dụng dịch vụ, bao gồm số lượng tokens đã sử dụng, số
              lượng requests, thời gian recording và translation
            </li>
            <li>
              <strong>Thông tin kỹ thuật:</strong> Địa chỉ IP, loại trình duyệt,
              hệ điều hành, và thông tin thiết bị
            </li>
            <li>
              <strong>Cookies và công nghệ tương tự:</strong> Chúng tôi sử dụng
              cookies và công nghệ tương tự để duy trì phiên đăng nhập và cải
              thiện trải nghiệm của bạn
            </li>
          </ul>

          <h3 className="mt-3 text-lg font-semibold">2.3. Dữ liệu nội dung</h3>
          <p className="mt-2">
            Khi bạn sử dụng BesideAI Extension để xử lý nội dung (email, PDF,
            screenshot, v.v.), dữ liệu này được gửi đến backend của chúng tôi
            để xử lý qua các mô hình AI. Chúng tôi lưu trữ dữ liệu này tạm thời
            để xử lý và không chia sẻ với bên thứ ba ngoài các nhà cung cấp AI
            được ủy quyền.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">3. Cách chúng tôi sử dụng thông tin</h2>
          <p className="mt-2">Chúng tôi sử dụng thông tin thu thập được để:</p>
          <ul className="mt-2 list-disc pl-6">
            <li>Cung cấp, duy trì và cải thiện dịch vụ BesideAI</li>
            <li>Xử lý các yêu cầu và giao dịch của bạn</li>
            <li>
              Gửi thông báo về dịch vụ, thay đổi điều khoản, hoặc thông tin
              quan trọng khác
            </li>
            <li>
              Phát hiện, ngăn chặn và giải quyết các vấn đề kỹ thuật hoặc lạm
              dụng
            </li>
            <li>
              Tuân thủ các nghĩa vụ pháp lý và bảo vệ quyền lợi của chúng tôi
            </li>
            <li>
              Phân tích cách sử dụng dịch vụ để cải thiện trải nghiệm người
              dùng
            </li>
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">4. Chia sẻ thông tin</h2>
          <p className="mt-2">
            Chúng tôi không bán thông tin cá nhân của bạn. Chúng tôi có thể chia
            sẻ thông tin trong các trường hợp sau:
          </p>
          <ul className="mt-2 list-disc pl-6">
            <li>
              <strong>Nhà cung cấp dịch vụ:</strong> Chúng tôi có thể chia sẻ
              thông tin với các nhà cung cấp dịch vụ bên thứ ba giúp chúng tôi
              vận hành dịch vụ, bao gồm:
              <ul className="mt-1 list-disc pl-6">
                <li>
                  <strong>Lemon Squeezy:</strong> Xử lý thanh toán và quản lý
                  subscription
                </li>
                <li>
                  <strong>Nhà cung cấp AI:</strong> OpenAI, Anthropic, và các
                  nhà cung cấp AI khác để xử lý các yêu cầu của bạn
                </li>
                <li>
                  <strong>Vercel:</strong> Hosting và infrastructure cho backend
                </li>
                <li>
                  <strong>Supabase:</strong> Database và authentication services
                </li>
              </ul>
            </li>
            <li>
              <strong>Yêu cầu pháp lý:</strong> Chúng tôi có thể tiết lộ thông
              tin nếu được yêu cầu bởi luật pháp hoặc để bảo vệ quyền lợi của
              chúng tôi
            </li>
            <li>
              <strong>Chuyển giao kinh doanh:</strong> Trong trường hợp sáp nhập,
              mua lại, hoặc bán tài sản, thông tin có thể được chuyển giao
            </li>
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">5. Bảo mật dữ liệu</h2>
          <p className="mt-2">
            Chúng tôi thực hiện các biện pháp bảo mật kỹ thuật và tổ chức phù
            hợp để bảo vệ thông tin cá nhân của bạn khỏi truy cập trái phép, mất
            mát, hoặc tiết lộ. Tuy nhiên, không có phương thức truyền tải qua
            internet hoặc lưu trữ điện tử nào là 100% an toàn.
          </p>
          <p className="mt-2">
            Các biện pháp bảo mật của chúng tôi bao gồm:
          </p>
          <ul className="mt-2 list-disc pl-6">
            <li>Mã hóa dữ liệu trong quá trình truyền (HTTPS/TLS)</li>
            <li>Xác thực và phân quyền người dùng</li>
            <li>API keys được lưu trữ an toàn trên server, không lộ trên client</li>
            <li>Giám sát và logging để phát hiện hoạt động đáng ngờ</li>
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">6. Lưu trữ dữ liệu</h2>
          <p className="mt-2">
            Chúng tôi lưu trữ thông tin cá nhân của bạn trong thời gian cần
            thiết để cung cấp dịch vụ và tuân thủ các nghĩa vụ pháp lý. Khi bạn
            xóa tài khoản, chúng tôi sẽ xóa hoặc ẩn danh hóa thông tin cá nhân
            của bạn, trừ khi luật pháp yêu cầu chúng tôi giữ lại.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">7. Quyền của bạn</h2>
          <p className="mt-2">Bạn có quyền:</p>
          <ul className="mt-2 list-disc pl-6">
            <li>
              <strong>Truy cập:</strong> Yêu cầu truy cập thông tin cá nhân mà
              chúng tôi lưu trữ về bạn
            </li>
            <li>
              <strong>Sửa đổi:</strong> Cập nhật hoặc sửa đổi thông tin cá nhân
              của bạn
            </li>
            <li>
              <strong>Xóa:</strong> Yêu cầu xóa thông tin cá nhân của bạn (quyền
              này có thể bị giới hạn bởi nghĩa vụ pháp lý)
            </li>
            <li>
              <strong>Từ chối:</strong> Từ chối một số cách sử dụng thông tin
              của bạn, chẳng hạn như marketing emails
            </li>
            <li>
              <strong>Di chuyển:</strong> Yêu cầu chuyển dữ liệu của bạn sang
              dịch vụ khác (nếu khả thi về mặt kỹ thuật)
            </li>
          </ul>
          <p className="mt-2">
            Để thực hiện các quyền này, vui lòng liên hệ chúng tôi tại{" "}
            <a
              href="mailto:support@besideai.work"
              className="text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
            >
              support@besideai.work
            </a>
            .
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">8. Cookies và công nghệ theo dõi</h2>
          <p className="mt-2">
            Chúng tôi sử dụng cookies và công nghệ tương tự để:
          </p>
          <ul className="mt-2 list-disc pl-6">
            <li>Duy trì phiên đăng nhập của bạn</li>
            <li>Ghi nhớ tùy chọn và cài đặt của bạn</li>
            <li>Phân tích cách sử dụng dịch vụ</li>
            <li>Cải thiện trải nghiệm người dùng</li>
          </ul>
          <p className="mt-2">
            Bạn có thể kiểm soát cookies thông qua cài đặt trình duyệt của mình.
            Tuy nhiên, việc vô hiệu hóa cookies có thể ảnh hưởng đến chức năng
            của dịch vụ.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">9. Trẻ em</h2>
          <p className="mt-2">
            Dịch vụ của chúng tôi không dành cho trẻ em dưới 13 tuổi (hoặc độ
            tuổi tối thiểu theo luật pháp địa phương). Chúng tôi không cố ý thu
            thập thông tin cá nhân từ trẻ em. Nếu bạn phát hiện rằng chúng tôi
            đã thu thập thông tin từ trẻ em, vui lòng liên hệ chúng tôi ngay.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">10. Thay đổi chính sách quyền riêng tư</h2>
          <p className="mt-2">
            Chúng tôi có thể cập nhật chính sách quyền riêng tư này theo thời
            gian. Chúng tôi sẽ thông báo cho bạn về bất kỳ thay đổi quan trọng
            nào bằng cách đăng chính sách mới trên trang này và cập nhật ngày
            "Last updated". Bạn nên xem xét chính sách này định kỳ.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">11. Liên hệ</h2>
          <p className="mt-2">
            Nếu bạn có bất kỳ câu hỏi hoặc mối quan tâm nào về chính sách quyền
            riêng tư này, vui lòng liên hệ chúng tôi tại:
          </p>
          <p className="mt-2">
            Email:{" "}
            <a
              href="mailto:support@besideai.work"
              className="text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
            >
              support@besideai.work
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}


